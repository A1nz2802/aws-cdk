import { App, Stack, StackProps } from 'aws-cdk-lib';

import * as beanstalk from './beanstalk';
import * as cloudformationLabs from './cloudformation';
import * as ec2Labs from './ec2';
import * as s3Labs from './s3';
import * as vpcLabs from './vpc';

type LabStackConstructor = new (
  // eslint-disable-next-line no-unused-vars
  app: App,
  // eslint-disable-next-line no-unused-vars
  id: string,
  // eslint-disable-next-line no-unused-vars
  props?: StackProps,
) => Stack;

const importsArr = [ec2Labs, s3Labs, vpcLabs, cloudformationLabs, beanstalk];

const allLabConstructors: LabStackConstructor[] = importsArr.flatMap(
  module => Object.values(module) as LabStackConstructor[],
);

const LAB_NUMBER = 17;

export function createStack(app: App) {
  const LabConstructor = allLabConstructors[LAB_NUMBER - 1];

  if (!LabConstructor) {
    throw new Error(`Lab stack ${LAB_NUMBER} not found`);
  }

  if (LAB_NUMBER < 1 || LAB_NUMBER > allLabConstructors.length) {
    throw new Error(`Invalid lab number: ${LAB_NUMBER}`);
  }

  return new LabConstructor(app, `lab-${LAB_NUMBER}-stack`, {
    stackName: `lab-${LAB_NUMBER}`,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
  });
}
