#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Ex3Stack } from 'lib/ex3-stack';


const app = new cdk.App();

if (!process.env.CDK_DEFAULT_ACCOUNT) {
  throw new Error('AWS account ID is missing, please set CDK_DEFAULT_ACCOUNT.')
}

new Ex3Stack(app, 'Exersice3CdkStack', {
  stackName: 'ex-3',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'coolest stack :)'
});