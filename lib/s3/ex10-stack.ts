import { Stack, StackProps } from 'aws-cdk-lib';
import { CfnBucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class Ex10Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new CfnBucket(this, 'MyBucket', {
      bucketName: 'my-bucket-5wyayv98o5nt70e',
      ownershipControls: {
        rules: [{ objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED }]
      },
      publicAccessBlockConfiguration: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      versioningConfiguration: {
        status: 'Suspended',
      },
      bucketEncryption: {
        serverSideEncryptionConfiguration: [{
          bucketKeyEnabled: true,
          serverSideEncryptionByDefault: {
            sseAlgorithm: 'AES256',
          }
        }]
      },
      objectLockEnabled: false,
      tags: [{ key: 'project', value: 'myapp' }]
    })    
  }
}