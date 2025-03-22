import { Stack, StackProps } from 'aws-cdk-lib';
import {
  CfnInstance,
  CfnInternetGateway,
  CfnRoute,
  CfnRouteTable,
  CfnSecurityGroup,
  CfnSubnet,
  CfnSubnetRouteTableAssociation,
  CfnVPC,
  CfnVPCGatewayAttachment,
} from 'aws-cdk-lib/aws-ec2';
import {
  CfnInstanceProfile,
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class Lab6 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Launch an EC2 instance with a security group for SSH/HTTP and attach an IAM role for S3 read-only access.';

    /* new CfnRole(this, '', {
      roleName: '',
      assumeRolePolicyDocument: '',
      managedPolicyArns: ['arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'],
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MyVpc'}]
    }) */

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
    const subnet1 = new CfnSubnet(this, 'MySubnet', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.1.0/24',
      availabilityZone: 'us-east-1a',
      mapPublicIpOnLaunch: true,
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MySubnet' },
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
          description: 'SSH Access',
        },
        {
          ipProtocol: 'tcp',
          toPort: 80,
          fromPort: 80,
          cidrIp: '0.0.0.0/0',
          description: 'HTTP Access',
        },
      ],
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'StorageLabs' },
      ],
    });

    const myRole = new Role(this, 'MyRole', {
      roleName: 'MyRole',
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
    });

    const myProfile = new CfnInstanceProfile(this, 'MyInstanceProfile', {
      instanceProfileName: 'MyInstanceProfile',
      roles: [myRole.roleName],
    });

    new CfnInstance(this, 'MyEc2', {
      imageId: 'ami-05b10e08d247fb927',
      instanceType: 't2.micro',
      subnetId: subnet1.attrSubnetId,
      securityGroupIds: [securityGroup.attrId],
      iamInstanceProfile: myProfile.ref,
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MyEc2' },
      ],
    });
  }
}
