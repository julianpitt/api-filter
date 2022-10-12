#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {InfrastructureStack} from './infrastructure-stack';

const app = new cdk.App();

new InfrastructureStack(
    app,
    'sluet-test-api-gateway-proxy',
    {
        description: 'Define an API Gateway to proxy incoming requests.',
        tags: {
            'Project': app.node.tryGetContext('ProjectName'),
            'Environment': app.node.tryGetContext('EnvironmentName'),
        },
    }
);

