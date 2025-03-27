import { App, Stack, StackProps } from 'aws-cdk-lib';

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

const labStackConstructors: LabStackConstructor[] = [
  ...Object.values(vpcLabs),
  ...Object.values(ec2Labs),
  ...Object.values(s3Labs),
];

const LAB_NUMBER = 14;

export function createStack(app: App) {
  const LabConstructor = labStackConstructors[LAB_NUMBER - 1];

  if (!LabConstructor) {
    throw new Error(`Number lab stack is not defined: ${LAB_NUMBER}`);
  }

  return new LabConstructor(app, `lab-${LAB_NUMBER}-stack`, {
    stackName: `lab-${LAB_NUMBER}`,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
  });
}
