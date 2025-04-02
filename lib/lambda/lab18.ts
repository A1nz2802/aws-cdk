import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Stack, StackProps } from 'aws-cdk-lib';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class Lab18 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Simple Lambda Function';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    new Function(this, 'MyLambda', {
      functionName: 'MyLambda',
      description: 'Simple lambda function',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.X86_64,
      code: Code.fromAsset(path.join(__dirname, 'files-lab18')),
      handler: 'index.handler',
    });
  }
}
