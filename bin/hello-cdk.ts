#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Ex6Stack } from 'lib/ex6-stack';

const app = new cdk.App();

if (!process.env.CDK_DEFAULT_ACCOUNT) {
  throw new Error('AWS account ID is missing, please set CDK_DEFAULT_ACCOUNT.')
}

new Ex6Stack(app, 'Exercise4CdkStack', {
  stackName: 'ex-4',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'coolest stack :)'
});