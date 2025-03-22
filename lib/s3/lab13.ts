import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  EventType,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { SnsDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export class Lab13 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'S3 Event Notifications';

    const myTopic = new Topic(this, 'MySnsTopic', {
      topicName: 'MyEmail',
    });

    myTopic.addSubscription(new EmailSubscription('a1nzdev28@gmail.com'));

    const myBucket = new Bucket(this, 'my-bucket', {
      bucketName: 'my-bucket-5wyasda9',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    myBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new SnsDestination(myTopic),
    );
  }
}
