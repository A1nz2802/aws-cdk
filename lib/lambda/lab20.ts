import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  Alias,
  Architecture,
  Code,
  EventSourceMapping,
  Function,
  Runtime,
  Version,
} from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class Lab20 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Lambda function with versioning and weighted alias';

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

    const myLambda = new Function(this, 'lambda20', {
      functionName: 'lambda20',
      description: 'Simple lambda function',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.X86_64,
      code: Code.fromAsset(path.join(__dirname, 'files-lab19')),
      handler: 'index.handler',
      role: lambdaRole,
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.RETAIN,
      },
    });

    const myQueue = new Queue(this, 'MyQueue20', {
      queueName: 'MyQueue20',
      fifo: false,
    });

    new EventSourceMapping(this, 'MyEventSourceMapping20', {
      eventSourceArn: myQueue.queueArn,
      target: myLambda,
      batchSize: 10,
      enabled: true,
    });

    //! this not works :/
    /* const version2 = new Version(this, `vv-123099a`, {
      lambda: myLambda,
      description: 'Version infinite of lambda20',
      removalPolicy: RemovalPolicy.RETAIN,
    }); */

    new Alias(this, 'LambdaAlias', {
      aliasName: 'Prod',
      version: myLambda.currentVersion,
      /* additionalVersions: [
        {
          version: version2,
          weight: 0.2,
        },
      ], */
    });
  }
}
