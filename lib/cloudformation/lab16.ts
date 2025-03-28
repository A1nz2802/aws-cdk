import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CfnStack } from 'aws-cdk-lib/aws-cloudformation';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class Lab16 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Add Parameters throught AWS CDK to a existing Cloudformation Stack';

    //* Create S3 Bucket
    const myBucket = new Bucket(this, 'cloudformation-bucket', {
      bucketName: 'cloudformation-bucket-5wyasda9',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    //* Upload files when the bucket is deployed
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const deployment = new BucketDeployment(this, 'DeployCloudformationFiles', {
      destinationBucket: myBucket,
      sources: [Source.asset(path.join(__dirname, 'files'))],
    });

    const complexStack = new CfnStack(this, 'ComplexStack', {
      templateUrl: myBucket.urlForObject('cloudformation-example.yml'),
      parameters: {
        EnvironmentName: 'CF-Test-VPC',
        PrivateSubnet1CIDR: '10.8.20.0/24',
        PrivateSubnet2CIDR: '10.8.21.0/24',
        PublicSubnet1CIDR: '10.8.10.0/24',
        PublicSubnet2CIDR: '10.8.11.0/24',
        VpcCIDR: '10.8.0.0/16',
      },
    });

    complexStack.node.addDependency(deployment);

    //! Don't forget to empty the s3 bucket using AWS Management Console after destroying the stack
  }
}
