import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { PolicyStatement, User } from 'aws-cdk-lib/aws-iam';
import { Key, KeySpec, KeyUsage } from 'aws-cdk-lib/aws-kms';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class Lab21 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Lambda function with encrypted environment variables (KMS)';

    const adminUser = User.fromUserName(this, 'my-admin-user', 'a1nz');

    const myKey = new Key(this, 'my-env-test', {
      alias: 'my-env-test',
      description: 'simple key for testing',
      keySpec: KeySpec.SYMMETRIC_DEFAULT,
      keyUsage: KeyUsage.ENCRYPT_DECRYPT,
      removalPolicy: RemovalPolicy.DESTROY,
      admins: [adminUser],
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    //! Encrypt DB_PASS with AWS CLI
    // aws kms encrypt --key-id alias/my-env-test --plaintext "MySecretPass!!" --query CiphertextBlob --output text | base64 --decode

    const myLambda = new Function(this, 'lambda21', {
      functionName: 'lambda21',
      description: 'Python lambda function :P',
      runtime: Runtime.PYTHON_3_13,
      architecture: Architecture.X86_64,
      code: Code.fromAsset(path.join(__dirname, 'files-lab21')),
      handler: 'lambdav1.handler',
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      environmentEncryption: myKey,
      environment: {
        DB_HOST: 'my-fake-database',
        DB_USER: 'a1nz',
        DB_PASS: 'MySecretPass!!',
      },
    });

    myKey.addToResourcePolicy(
      new PolicyStatement({
        principals: [myLambda.role!],
        actions: ['kms:*'],
        resources: ['*'],
      }),
    );
  }
}
