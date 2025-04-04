import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class Lab22 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Destinations and DLQ';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const myQueue = new Queue(this, 'MyQueue19', {
      queueName: 'MyQueue19',
      fifo: false,
    });

    new Function(this, 'lambda22', {
      functionName: 'lambda22',
      description: 'Python lambda function :P',
      runtime: Runtime.PYTHON_3_13,
      architecture: Architecture.X86_64,
      code: Code.fromAsset(path.join(__dirname, 'files-lab22')),
      handler: 'v1.handler',
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      onSuccess: new SqsDestination(myQueue), //successQueue
      onFailure: new SqsDestination(myQueue), //failureQueue
      deadLetterQueue: myQueue,
      environment: {
        DB_HOST: 'my-fake-database',
        DB_USER: 'a1nz',
        DB_PASS: 'MySecretPass!!',
      },
    });
  }
}
