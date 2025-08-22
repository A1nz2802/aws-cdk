import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  MysqlEngineVersion,
} from 'aws-cdk-lib/aws-rds';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export class Lab37 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //! Lab not tested
    this.templateOptions.description = 'Create Encrypted Copy of RDS Database';

    const vpc = new Vpc(this, 'WorkflowVPC', { maxAzs: 2 });

    const unencryptedDb = new DatabaseInstance(this, 'UnencryptedDB', {
      vpc,
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_4_5,
      }),
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
      storageEncrypted: false,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const createSnapshotTask = new tasks.CallAwsService(
      this,
      'CreateSnapshot',
      {
        service: 'rds',
        action: 'createDBSnapshot',
        parameters: {
          DBInstanceIdentifier: unencryptedDb.instanceIdentifier,
          DBSnapshotIdentifier: sfn.JsonPath.format(
            'snapshot-{}',
            sfn.JsonPath.uuid(),
          ),
        },
        iamResources: [unencryptedDb.instanceArn],
        resultPath: '$.SnapshotResult',
      },
    );

    const copySnapshotTask = new tasks.CallAwsService(
      this,
      'CopyAndEncryptSnapshot',
      {
        service: 'rds',
        action: 'copyDBSnapshot',
        parameters: {
          SourceDBSnapshotIdentifier: sfn.JsonPath.stringAt(
            '$.SnapshotResult.DBSnapshot.DBSnapshotArn',
          ),
          TargetDBSnapshotIdentifier: sfn.JsonPath.format(
            'encrypted-snapshot-{}',
            sfn.JsonPath.uuid(),
          ),
          KmsKeyId: 'alias/aws/rds',
          CopyTags: true,
        },

        iamResources: [`arn:aws:rds:${this.region}:${this.account}:snapshot:*`],
        resultPath: '$.CopiedSnapshotResult',
      },
    );

    const restoreEncryptedDbTask = new tasks.CallAwsService(
      this,
      'RestoreEncryptedDB',
      {
        service: 'rds',
        action: 'restoreDBInstanceFromDBSnapshot',
        parameters: {
          DBInstanceIdentifier: 'my-restored-encrypted-db',
          DBSnapshotIdentifier: sfn.JsonPath.stringAt(
            '$.CopiedSnapshotResult.DBSnapshot.DBSnapshotIdentifier',
          ),
        },
        iamResources: [`arn:aws:rds:${this.region}:${this.account}:snapshot:*`],
        resultPath: sfn.JsonPath.DISCARD,
      },
    );

    const deleteOriginalDbTask = new tasks.CallAwsService(
      this,
      'DeleteOriginalDB',
      {
        service: 'rds',
        action: 'deleteDBInstance',
        parameters: {
          DBInstanceIdentifier: unencryptedDb.instanceIdentifier,
          SkipFinalSnapshot: true,
        },
        iamResources: [unencryptedDb.instanceArn],
      },
    );

    const definition = createSnapshotTask
      .next(copySnapshotTask)
      .next(restoreEncryptedDbTask)
      .next(deleteOriginalDbTask);

    const stateMachine = new sfn.StateMachine(this, 'EncryptRdsStateMachine', {
      stateMachineName: 'EncryptRdsDatabaseWorkflow',
      definition,
    });

    stateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ['iam:PassRole'],
        resources: ['*'],
      }),
    );
  }
}
