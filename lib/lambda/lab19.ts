import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Stack, StackProps } from 'aws-cdk-lib';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  Architecture,
  Code,
  EventSourceMapping,
  Function,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class Lab19 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Lambda function connected to an SQS queue via EventSourceMapping';

    const lambdaRole = new Role(this, 'MySQSRole', {
      roleName: 'MySQSRole',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaSQSQueueExecutionRole',
        ),
      ],
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const myLambda = new Function(this, 'lambda19', {
      functionName: 'lambda19',
      description: 'Simple lambda function',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.X86_64,
      code: Code.fromAsset(path.join(__dirname, 'files-lab19')),
      handler: 'index.handler',
      role: lambdaRole,
    });

    const myQueue = new Queue(this, 'MyQueue19', {
      queueName: 'MyQueue19',
      fifo: false,
    });

    new EventSourceMapping(this, 'MyEventSourceMapping19', {
      eventSourceArn: myQueue.queueArn,
      target: myLambda,
      batchSize: 10,
      enabled: true,
    });
  }
}
