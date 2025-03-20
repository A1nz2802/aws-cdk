import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Lab1 } from './vpc/lab1-stack';
import { Lab2 } from './vpc/lab2-stack';

type LabStackConstructor = new (app: App, id: string, props?: StackProps) => Stack;

const labStackConstructors: LabStackConstructor[] = [
  Lab1, Lab2
]

const LAB_NUMBER = 2;

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