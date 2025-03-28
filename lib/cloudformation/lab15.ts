import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Fn, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CfnStack } from 'aws-cdk-lib/aws-cloudformation';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class Lab15 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Create Cloudformation Nested Stack';

    //* Create S3 Bucket
    const myBucket = new Bucket(this, 'cloudformation-bucket', {
      bucketName: 'cloudformation-bucket-5wyasda9',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    //! Maybe this is unnecessary, I'm too lazy to check it
    myBucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'],
        principals: [new ServicePrincipal('cloudformation.amazonaws.com')],
        resources: [myBucket.arnForObjects('*')],
      }),
    );

    //* Upload files when the bucket is deployed
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const deployment = new BucketDeployment(this, 'DeployCloudformationFiles', {
      destinationBucket: myBucket,
      sources: [Source.asset(path.join(__dirname, 'files'))],
    });

    const vpcStack = new CfnStack(this, 'NestedStackVPC', {
      templateUrl: myBucket.urlForObject('vpc.yml'),
    });

    vpcStack.node.addDependency(deployment);

    const subnet1Stack = new CfnStack(this, 'subnet1Stack', {
      templateUrl: myBucket.urlForObject('subnet1.yml'),
      parameters: {
        VpcId: Fn.getAtt(vpcStack.logicalId, 'Outputs.VpcId').toString(),
      },
    });

    const subnet2Stack = new CfnStack(this, 'subnet2Stack', {
      templateUrl: myBucket.urlForObject('subnet2.yml'),
      parameters: {
        VpcId: Fn.getAtt(vpcStack.logicalId, 'Outputs.VpcId').toString(),
      },
    });

    subnet1Stack.addDependency(vpcStack);
    subnet2Stack.addDependency(vpcStack);
  }
}
