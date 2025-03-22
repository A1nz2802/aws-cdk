import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class Lab11 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'S3 Replication and Lifecycle rules';

    const destinationBucket = new Bucket(this, 'DestinationBucket', {
      bucketName: 'destination-bucket-5wyasda10',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: true,
    });

    const SOURCE_BUCKET_NAME = 'source-bucket-5wyasda9';

    const replicationRole = new Role(this, 'SRR-S3', {
      roleName: 'SRR-S3',
      assumedBy: new ServicePrincipal('s3.amazonaws.com'),
      inlinePolicies: {
        S3ReplicationPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                's3:GetReplicationConfiguration',
                's3:ListBucket',
                's3:GetObjectVersionForReplication',
                's3:GetObjectVersionAcl',
                's3:GetObjectVersionTagging',
              ],
              resources: [
                `arn:aws:s3:::${SOURCE_BUCKET_NAME}`,
                `arn:aws:s3:::${SOURCE_BUCKET_NAME}/*`,
              ],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                's3:ReplicateObject',
                's3:ReplicateDelete',
                's3:ReplicateTags',
              ],
              resources: [destinationBucket.arnForObjects('*')],
            }),
          ],
        }),
      },
    });

    const sourceBucket = new Bucket(this, 'source-bucket', {
      bucketName: 'source-bucket-5wyasda9',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: true,
      replicationRules: [
        {
          destination: destinationBucket,
          priority: 1,
          deleteMarkerReplication: true,
        },
      ],
      //! untested
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: StorageClass.GLACIER,
              transitionAfter: Duration.days(30),
            },
          ],
          expiration: Duration.days(365),
        },
      ],
    });

    sourceBucket.grantReadWrite(replicationRole);
  }
}
