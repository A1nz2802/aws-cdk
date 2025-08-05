import { Stack, StackProps } from 'aws-cdk-lib';
import { Trail } from 'aws-cdk-lib/aws-cloudtrail';
import {
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Rule } from 'aws-cdk-lib/aws-events';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export class Lab24 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = '';

    // Create SNS topic
    const topic = new Topic(this, 'my-sns-topic-02', {
      topicName: 'topic-eventbridge',
      fifo: false,
    });

    // Subscribe sns topic to
    new Subscription(this, 'my-subscription', {
      topic,
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: 'a1nzdev28@gmail.com',
    });

    // Create trail form AWS CloudTrail
    new Trail(this, 'MyManagementEventsTrail', {
      trailName: 'my-managment-events',
      sendToCloudWatchLogs: true,
    });

    // Get default VPC
    const vpc = Vpc.fromLookup(this, 'VPC', {
      isDefault: true,
      region: 'us-east-1',
    });

    // Create EC2 instance
    new Instance(this, 'My-Instance', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux2023(),
    });

    const eventRule = new Rule(this, 'ec2-stopped-rule', {
      ruleName: 'ec2-stop-instnaces-event',
      eventPattern: {
        source: ['aws.ec2'],
        detailType: ['EC2 Instance State-change Notification'],
        detail: {
          state: ['terminated'],
        },
      },
    });

    eventRule.addTarget(new SnsTopic(topic));
  }
}
