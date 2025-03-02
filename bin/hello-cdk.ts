#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { HelloCdkStack } from '../lib/hello-cdk-stack';

const app = new cdk.App();

if (!process.env.CDK_DEFAULT_ACCOUNT) {
  throw new Error('AWS account ID is missing, please set CDK_DEFAULT_ACCOUNT.')
}

new HelloCdkStack(app, 'HelloCdkStack', {
  stackName: 'test-stack',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'coolest stack :)'
});