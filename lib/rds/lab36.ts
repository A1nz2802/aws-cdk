import { Duration, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseInstanceReadReplica,
  MysqlEngineVersion,
  StorageType,
} from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class Lab36 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Create Read Replica';

    const vpc = new Vpc(this, 'AppVCP', {
      vpcName: 'AppVPC',
      availabilityZones: ['us-east-1a', 'us-east-1b'],
      createInternetGateway: true,
      subnetConfiguration: [
        {
          name: 'public-sub',
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private-sub',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    const rdsSecutiryGroup = new SecurityGroup(this, 'RdsSecurityGroup', {
      vpc,
      description: 'Security group for the RDS MySQL instance',
      allowAllOutbound: true,
    });

    const primaryDb = new DatabaseInstance(this, 'MySqlRdsInstance', {
      vpc,
      databaseName: 'MyDatabase',
      publiclyAccessible: false,
      securityGroups: [rdsSecutiryGroup],
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
      availabilityZone: 'us-east-1a',
      autoMinorVersionUpgrade: true,
      storageEncrypted: false,
      storageType: StorageType.GP2,
      maxAllocatedStorage: 1000,
      vpcSubnets: {
        subnets: vpc.privateSubnets,
      },
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_4_5,
      }),
      credentials: {
        username: 'admin',
        password: SecretValue.unsafePlainText('securepassword123'),
      },
      backupRetention: Duration.days(1),
      copyTagsToSnapshot: true,
      allowMajorVersionUpgrade: false,
    });

    new DatabaseInstanceReadReplica(this, 'MySqlReadReplica', {
      vpc,
      sourceDatabaseInstance: primaryDb,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
      securityGroups: [rdsSecutiryGroup],
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
  }
}
