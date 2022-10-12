import { Fn } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionBase } from 'aws-cdk-lib/aws-lambda';

export type AppConfigCreationInputs = {
  applicationName: string;
  envName: string;
  profileName: string;
};

export type AppConfigCreationOutputs = {
  appConfigApplicationId: string;
  appConfigDeploymentStrategyId: string;
};

export type AppConfigAccessInputs = AppConfigCreationInputs & AppConfigCreationOutputs;

export function addAppConfigToFunctionRolePolicy(
  fn: FunctionBase,
  applicationId: string,
  deploymentStrategyId: string,
) {
  fn.addToRolePolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'appconfig:ListEnvironments',
        'appconfig:GetEnvironment',
        'appconfig:GetDeploymentStrategy',
        'appconfig:ListConfigurationProfiles',
        'appconfig:ListDeployments',
        'appconfig:GetDeployment',
        'appconfig:GetConfiguration',
        'appconfig:GetApplication',
        'appconfig:GetConfigurationProfile',
      ],
      resources: [
        Fn.sub('arn:aws:appconfig:${AWS::Region}:${AWS::AccountId}:application/'),
        Fn.sub(
          'arn:aws:appconfig:${AWS::Region}:${AWS::AccountId}:application/${applicationId}/environment/*',
          { applicationId },
        ),
        Fn.sub(
          'arn:aws:appconfig:${AWS::Region}:${AWS::AccountId}:application/${applicationId}/configurationprofile/*',
          { applicationId },
        ),
        Fn.sub(
          'arn:aws:appconfig:${AWS::Region}:${AWS::AccountId}:deploymentstrategy/${deploymentStrategyId}',
          { deploymentStrategyId },
        ),
      ],
    }),
  );

  fn.addToRolePolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'appconfig:GetDeployment',
        'appconfig:StartConfigurationSession',
        'appconfig:GetLatestConfiguration',
      ],
      resources: [
        Fn.sub(
          'arn:aws:appconfig:${AWS::Region}:${AWS::AccountId}:application/${applicationId}/environment/*/configuration/*',
          { applicationId },
        ),
        Fn.sub(
          'arn:aws:appconfig:${AWS::Region}:${AWS::AccountId}:application/${applicationId}/environment/*/deployment/*',
          { applicationId },
        ),
      ],
    }),
  );
}
