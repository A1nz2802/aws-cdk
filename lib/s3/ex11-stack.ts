import { SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { Effect, PolicyStatement, User } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, BucketEncryption, CfnBucketPolicy, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class Ex11Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //* Create an IAM User with a temporary password
    const user = new User(this, 'MyUser', {
      userName: 'Erik', // Username for the IAM user
      password: SecretValue.unsafePlainText('TempPassword123!'), // Temporary password (not recommended for production)
      passwordResetRequired: false, // Disables password reset requirement on first login
    });

    //* Create an S3 bucket
    const myBucket = new Bucket(this, 'MyBucket', {
      bucketName: 'my-bucket-5wyayv98o5nt70e',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: false,
    })

    //* Add Identity-Based Policies to the created user
    //* Policy to allow listing all buckets and accessing bucket locations
    user.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:ListAllMyBuckets', 's3:GetBucketLocation', 's3:ListBucket'],
      resources: ['*'], // Grants access to all S3 buckets
    }));

    //* Policy to allow uploading and retrieving objects in the specific bucket
    user.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:PutObject', 's3:GetObject'],
      resources: [`${myBucket.bucketArn}/*`] // Grants access to objects in the specific bucket
    }));

    //* This statement explicitly denies the DeleteObject action to override any conflicting Resource-Based Policies.
    user.addToPolicy(new PolicyStatement({
      sid: 'AllowDeleteObject',
      effect: Effect.DENY,
      actions: ['s3:DeleteObject'],
      resources: [`${myBucket.bucketArn}/*`],
    }))

    //* Add a Resource-Based Policy to the S3 bucket
    //* Policy to allow the user to delete objects in the bucket
    //* Create a proper policy document
    //* Create policy with this method to avoid circular dependecy.
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowDeleteObject',
          Effect: 'Allow',
          Principal: {
            AWS: user.userArn
          },
          Action: 's3:DeleteObject',
          Resource: `${myBucket.bucketArn}/*`
        }
      ]
    };

    //* Add a Resource-Based Policy to the S3 bucket
    //* Policy to allow the user to delete objects in the bucket
    new CfnBucketPolicy(this, 'MyBucketPolicy', {
      bucket: myBucket.bucketName!, // Specifies the bucket to attach the policy to
      policyDocument,
    });
  }
}