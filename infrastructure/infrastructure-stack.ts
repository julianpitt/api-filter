import * as cdk from 'aws-cdk-lib';
import {Duration} from 'aws-cdk-lib';
import {
    LambdaIntegration,
    LogGroupLogDestination,
    RestApi,
    AccessLogFormat,
    MethodLoggingLevel,
    Cors,
} from 'aws-cdk-lib/aws-apigateway';
import {Runtime, Tracing} from 'aws-cdk-lib/aws-lambda';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {LogGroup} from 'aws-cdk-lib/aws-logs';
import {Construct} from 'constructs';
import {
    CfnApplication,
    CfnConfigurationProfile,
    CfnDeployment,
    CfnDeploymentStrategy,
    CfnEnvironment,
    CfnHostedConfigurationVersion,
} from 'aws-cdk-lib/aws-appconfig';
import * as path from 'path';
import * as fs from 'fs';
import {addAppConfigToFunctionRolePolicy} from './config/appConfig';

export class InfrastructureStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const projectName = this.node.tryGetContext('ProjectName');
        const envName = this.node.tryGetContext('EnvironmentName');

        const applicationName = `${projectName}-${envName}`;
        const applicationDescription = `API Proxy for ${applicationName}`;
        const profileName = `${applicationName}-functionConfig`;

        const myLogGroup = new LogGroup(this, '/Proxy/APIGatway/AccessLogs');

        const api = new RestApi(this, 'api', {
            restApiName: applicationName,
            description: applicationDescription,
            deployOptions: {
                stageName: envName,
                accessLogDestination: new LogGroupLogDestination(myLogGroup),
                loggingLevel: MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                tracingEnabled: true,
                accessLogFormat: AccessLogFormat.jsonWithStandardFields({
                    caller: true,
                    httpMethod: true,
                    ip: true,
                    protocol: true,
                    requestTime: true,
                    resourcePath: true,
                    responseLength: true,
                    status: true,
                    user: true,
                }),
            },

            cloudWatchRole: true,
            defaultCorsPreflightOptions: {
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
                allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                allowCredentials: true,
                allowOrigins: ['http://localhost:3000'],
            },
        });

        const lambdaFunction = new NodejsFunction(this, `proxyFunction`, {
            bundling: {minify: true, sourceMap: true},
            environment: {
                NODE_OPTIONS: '--enable-source-maps',
                configLocation: 'AppConfig',
                configApplicationName: applicationName,
                configEnvName: envName,
                configProfileName: profileName,
            },
            tracing: Tracing.ACTIVE,
            timeout: Duration.minutes(5),
            runtime: Runtime.NODEJS_16_X,
            // functionName: `${applicationName}-proxy`,
            handler: 'handler',
            entry: path.join(__dirname, `../functions/proxy/index.ts`),
        });

        const corsPreflightSettings = {
            allowOrigins: Cors.ALL_METHODS,
            allowMethods: Cors.ALL_ORIGINS,
        };

        // handles root requests
        api.root.addMethod(
            'ANY',
            new LambdaIntegration(lambdaFunction, {
                requestTemplates: {'application/json': '{ "statusCode": "200" }'},
            }),
        );
        // api.root.addCorsPreflight(corsPreflightSettings);

        // handles all paths from root
        api.root.addProxy({
            anyMethod: true,
            defaultCorsPreflightOptions: corsPreflightSettings,
            defaultIntegration: new LambdaIntegration(lambdaFunction, {
                requestTemplates: {'application/json': '{ "statusCode": "200" }'},
            }),
        });

        const appConfigApp = new CfnApplication(this, 'appConfigApplication', {
            name: applicationName,
        });

        const appConfigProfile = new CfnConfigurationProfile(this, 'appConfigConfigProfile', {
            name: profileName,
            applicationId: appConfigApp.ref,
            locationUri: 'hosted',
            validators: [
                {
                    type: 'JSON_SCHEMA',
                    content: fs
                        .readFileSync(path.resolve(__dirname, './config/appConfigJSONSchema.json'))
                        .toString(),
                },
            ],
        });

        const configVersion = new CfnHostedConfigurationVersion(this, 'appConfigInitialVersion', {
            applicationId: appConfigApp.ref,
            configurationProfileId: appConfigProfile.ref,
            contentType: 'application/json',
            content: fs.readFileSync(path.resolve(__dirname, './config/initialConfig.json')).toString(),
        });

        const deploymentStrategy = new CfnDeploymentStrategy(this, 'appConfigDeploymentStrategy', {
            name: 'Immediate',
            deploymentDurationInMinutes: 0,
            finalBakeTimeInMinutes: 0,
            growthFactor: 100,
            growthType: 'LINEAR',
            replicateTo: 'NONE',
        });

        const deploymentEnvironment = new CfnEnvironment(this, 'appConfigDeploymentEnv', {
            applicationId: appConfigApp.ref,
            name: envName,
        });

        // Allow this function to call AppConfig
        addAppConfigToFunctionRolePolicy(lambdaFunction, appConfigApp.ref, deploymentStrategy.ref);

        new CfnDeployment(this, 'appConfigInitialDeployment', {
            applicationId: appConfigApp.ref,
            deploymentStrategyId: deploymentStrategy.ref,
            environmentId: deploymentEnvironment.ref,
            configurationProfileId: appConfigProfile.ref,
            configurationVersion: configVersion.ref,
        });

        new cdk.CfnOutput(this, 'apiUrl', {value: api.url});
    }
}
