import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AnyPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class Lab12 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'S3 Enforce Encryption with AWS KMS';

    //! Note that the specified encryption is the default.
    const myBucket = new Bucket(this, 'encrypted-bucket', {
      bucketName: 'encrypted-bucket-5wyasda9',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    //* Construct L2 to add policy to an existing s3 bucket
    //* This policy denies uploading files that arent encrypted with AWS KMS
    myBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'DenyUnEncryptedObjectUploads',
        effect: Effect.DENY,
        principals: [new AnyPrincipal()],
        actions: ['s3:PutObject'],
        resources: [myBucket.arnForObjects('*')],
        conditions: {
          StringNotEquals: {
            's3:x-amz-server-side-encryption': 'aws:kms',
          },
        },
      }),
    );
  }
}
