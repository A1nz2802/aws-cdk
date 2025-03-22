import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import {
  CfnInstance,
  CfnInternetGateway,
  CfnRoute,
  CfnRouteTable,
  CfnSecurityGroup,
  CfnSecurityGroupIngress,
  CfnSubnet,
  CfnSubnetRouteTableAssociation,
  CfnVPC,
  CfnVPCGatewayAttachment,
  UserData,
} from 'aws-cdk-lib/aws-ec2';
import {
  CfnFileSystem,
  CfnMountTarget,
  LifecyclePolicy,
  PerformanceMode,
  ThroughputMode,
} from 'aws-cdk-lib/aws-efs';
import { Construct } from 'constructs';

export class Lab4 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Launch multi-AZ instances, configure security, and mount an EFS file system using both NFS and EFS utils.';

    //* Create VPC
    const vpc = new CfnVPC(this, 'MyVPC', {
      cidrBlock: '10.0.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      instanceTenancy: 'default',
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MyVpc' },
      ],
    });

    //* Create Subnets
    const subnet1 = new CfnSubnet(this, 'MySubnet-1', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.1.0/24',
      availabilityZone: 'us-east-1a',
      mapPublicIpOnLaunch: true,
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MySubnet-1' },
      ],
    });

    const subnet2 = new CfnSubnet(this, 'MySubnet-2', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.2.0/24',
      availabilityZone: 'us-east-1b',
      mapPublicIpOnLaunch: true,
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MySubnet-2' },
      ],
    });

    //* Create Public Route Table
    const route = new CfnRouteTable(this, 'MyPublic-RT', {
      vpcId: vpc.attrVpcId,
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MyPublic-RT' },
      ],
    });

    //* Attach Route table to subnets
    new CfnSubnetRouteTableAssociation(this, 'AttachRtToSubnet1', {
      subnetId: subnet1.attrSubnetId,
      routeTableId: route.attrRouteTableId,
    });

    new CfnSubnetRouteTableAssociation(this, 'AttachRtToSubnet2', {
      subnetId: subnet2.attrSubnetId,
      routeTableId: route.attrRouteTableId,
    });

    //* Create Internet Gateway
    const igw = new CfnInternetGateway(this, 'MyIGW', {
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MyIGW' },
      ],
    });

    //* Attach IGW to VPC
    new CfnVPCGatewayAttachment(this, 'AttachVpcToIgw', {
      vpcId: vpc.attrVpcId,
      internetGatewayId: igw.attrInternetGatewayId,
    });

    //* Add new route to route table
    new CfnRoute(this, 'IgwRoute', {
      routeTableId: route.attrRouteTableId,
      destinationCidrBlock: '0.0.0.0/0',
      gatewayId: igw.attrInternetGatewayId,
    });

    const securityGroup = new CfnSecurityGroup(this, 'MySG', {
      vpcId: vpc.attrVpcId,
      groupName: 'StorageLabs',
      groupDescription: 'Temporary SG for the Storage Service Labs',
      securityGroupIngress: [
        {
          ipProtocol: 'tcp',
          toPort: 22,
          fromPort: 22,
          cidrIp: '0.0.0.0/0',
          description: 'anywhere rule :p',
        },
      ],
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'StorageLabs' },
      ],
    });

    new CfnSecurityGroupIngress(this, 'AddSGRuleToMySG', {
      groupId: securityGroup.attrId,
      ipProtocol: 'tcp',
      toPort: 2049,
      fromPort: 2049,
      sourceSecurityGroupId: securityGroup.attrId,
    });

    //* Create EFS
    const myEfs = new CfnFileSystem(this, 'MyEFS', {
      throughputMode: ThroughputMode.ELASTIC,
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      lifecyclePolicies: [
        { transitionToIa: LifecyclePolicy.AFTER_30_DAYS },
        { transitionToArchive: LifecyclePolicy.AFTER_90_DAYS },
      ],
      encrypted: true,
      fileSystemTags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MyEFS' },
      ],
    });

    //* Add EFS mount targets
    new CfnMountTarget(this, 'MyEFSTargetMount1', {
      subnetId: subnet1.attrSubnetId,
      fileSystemId: myEfs.attrFileSystemId,
      securityGroups: [securityGroup.attrId],
    });

    new CfnMountTarget(this, 'MyEFSTargetMount2', {
      subnetId: subnet2.attrSubnetId,
      fileSystemId: myEfs.attrFileSystemId,
      securityGroups: [securityGroup.attrId],
    });

    const EFS_DNS = `${myEfs.attrFileSystemId}${Fn.sub('.efs.${AWS::Region}.amazonaws.com')}`;

    function createEfsUserData(message: string, outputFile: string): UserData {
      const userData = UserData.forLinux();
      userData.addCommands(
        'mkdir -p /home/ec2-user/efs-mount-point',
        'sudo yum -y install nfs-utils',
        'sleep 30',
        `sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport ${EFS_DNS}:/ /home/ec2-user/efs-mount-point`,
        `echo '${EFS_DNS}' > /home/ec2-user/dns.txt`,
        `echo '${message}' | sudo tee /home/ec2-user/efs-mount-point/${outputFile}`,
      );
      return userData;
    }

    const userData1 = createEfsUserData(
      'hello from instance 1 :P',
      'instance1.txt',
    );
    const userData2 = createEfsUserData(
      'hello from instance 2 :X',
      'instance2.txt',
    );

    //* Create 2 Ec2 Instance
    new CfnInstance(this, 'MyInstace-1', {
      imageId: 'ami-05b10e08d247fb927',
      instanceType: 't2.micro',
      subnetId: subnet1.attrSubnetId,
      securityGroupIds: [securityGroup.attrId],
      userData: Fn.base64(userData1.render()),
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MyInstace-1' },
      ],
    });

    new CfnInstance(this, 'MyInstace-2', {
      imageId: 'ami-05b10e08d247fb927',
      instanceType: 't2.micro',
      subnetId: subnet2.attrSubnetId,
      securityGroupIds: [securityGroup.attrId],
      userData: Fn.base64(userData2.render()),
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MyInstace-2' },
      ],
    });
  }
}
