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
import { Construct } from 'constructs';

export class Lab2 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Custom VPC, subnets and IGW';

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

    //* Create 4 Subnets
    const subnet1 = new CfnSubnet(this, 'Public-1A', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.1.0/24',
      mapPublicIpOnLaunch: true,
      availabilityZone: 'us-east-1a',
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'Public-1A' },
      ],
    });

    const subnet2 = new CfnSubnet(this, 'Public-1B', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.2.0/24',
      mapPublicIpOnLaunch: true,
      availabilityZone: 'us-east-1b',
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'Public-1B' },
      ],
    });

    const subnet3 = new CfnSubnet(this, 'Private-1A', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.3.0/24',
      availabilityZone: 'us-east-1a',
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'Private-1A' },
      ],
    });

    const subnet4 = new CfnSubnet(this, 'Private-1B', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.4.0/24',
      availabilityZone: 'us-east-1b',
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'Private-1B' },
      ],
    });

    //* Create 2 Route Tables
    const publicRt = new CfnRouteTable(this, 'Public-RT', {
      vpcId: vpc.attrVpcId,
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'Public-RT' },
      ],
    });

    const privateRt = new CfnRouteTable(this, 'Private-RT', {
      vpcId: vpc.attrVpcId,
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'Private-RT' },
      ],
    });

    //* Attach Route table to subnets
    new CfnSubnetRouteTableAssociation(this, 'AttachPubRtToSubnet1', {
      subnetId: subnet1.attrSubnetId,
      routeTableId: publicRt.attrRouteTableId,
    });

    new CfnSubnetRouteTableAssociation(this, 'AttachPubRtToSubnet2', {
      subnetId: subnet2.attrSubnetId,
      routeTableId: publicRt.attrRouteTableId,
    });

    new CfnSubnetRouteTableAssociation(this, 'AttachPrivRtToSubnet3', {
      subnetId: subnet3.attrSubnetId,
      routeTableId: privateRt.attrRouteTableId,
    });

    new CfnSubnetRouteTableAssociation(this, 'AttachPrivRtToSubnet4', {
      subnetId: subnet4.attrSubnetId,
      routeTableId: privateRt.attrRouteTableId,
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
      routeTableId: publicRt.attrRouteTableId,
      destinationCidrBlock: '0.0.0.0/0',
      gatewayId: igw.attrInternetGatewayId,
    });

    //* Create SG (Security Group) with name SGWebAccess and add description (whenever)
    //* additionaly, add rules: ssh/tcp/port 22 | anywhere/0.0.0.0/0
    const securityGroup = new CfnSecurityGroup(this, 'MySG', {
      vpcId: vpc.attrVpcId,
      groupName: 'SGWebAccess',
      groupDescription: 'SG for my custom VPC',
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
        { key: 'Name', value: 'WebAccessMyVPC' },
      ],
    });

    //* Create Ec2 Instance in public subnet
    new CfnInstance(this, 'MyEC2', {
      imageId: 'ami-05b10e08d247fb927',
      instanceType: 't2.micro',
      subnetId: subnet2.attrSubnetId,
      securityGroupIds: [securityGroup.attrId],
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'MyEC2' },
      ],
    });
  }
}

/* new Ex2Stack(app, 'Exercise2CdkStack', {
  stackName: 'ex-2',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'coolest stack :)'
}); */
