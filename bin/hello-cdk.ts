import { App } from 'aws-cdk-lib';
import { createStack } from 'lib/stack-map';

const app = new App();

if (!process.env.CDK_DEFAULT_ACCOUNT) {
  throw new Error('AWS account ID is missing, please set CDK_DEFAULT_ACCOUNT.');
}

createStack(app);
