#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from './infrastructure-stack';

const app = new cdk.App();

new InfrastructureStack(app, 'InfrastructureStack', {});
