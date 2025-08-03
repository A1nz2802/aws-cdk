import { Stack, StackProps } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  Table,
  TableClass,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class Lab23 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = '';

    const forumTable = new Table(this, 'ForumTable', {
      tableName: 'forum',
      partitionKey: {
        name: 'postId',
        type: AttributeType.STRING,
      },
      tableClass: TableClass.STANDARD,
      billingMode: BillingMode.PROVISIONED,
      writeCapacity: 1,
      readCapacity: 1,
      encryption: TableEncryption.DEFAULT,
    });

    forumTable
      .autoScaleReadCapacity({
        minCapacity: 1,
        maxCapacity: 10,
      })
      .scaleOnUtilization({
        targetUtilizationPercent: 70,
      });

    forumTable
      .autoScaleWriteCapacity({
        minCapacity: 1,
        maxCapacity: 10,
      })
      .scaleOnUtilization({
        targetUtilizationPercent: 70,
      });

    new Table(this, 'StoreTable', {
      tableName: 'store',
      partitionKey: {
        name: 'clientId',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'created',
        type: AttributeType.STRING,
      },
    });
  }
}
