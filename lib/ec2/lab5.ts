import fs from 'node:fs';

import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import {
  CfnInstance,
  CfnInternetGateway,
  CfnLaunchTemplate,
  CfnRoute,
  CfnRouteTable,
  CfnSecurityGroup,
  CfnSubnet,
  CfnSubnetRouteTableAssociation,
  CfnVPC,
  CfnVPCGatewayAttachment,
  LaunchTemplateHttpTokens,
  UserData,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class Lab5 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Retrieve instance metadata using IMDS v1 and v2, and display it on a web page via a user-data script.';

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

    //! Environment variables are not persist in post-build instance
    const scriptContent = fs.readFileSync('scripts/ex5.sh', 'utf8');

    const userData = UserData.forLinux();
    userData.addCommands(scriptContent);

    //! IMDSv2 is required by default
    const launchTemplate = new CfnLaunchTemplate(this, 'MakeIMDSv2Optional', {
      launchTemplateData: {
        metadataOptions: {
          httpTokens: LaunchTemplateHttpTokens.OPTIONAL,
        },
      },
    });

    //* Create 2 Ec2 Instance
    new CfnInstance(this, 'IMDSv1', {
      launchTemplate: {
        launchTemplateId: launchTemplate.attrLaunchTemplateId,
        version: launchTemplate.attrDefaultVersionNumber,
      },
      imageId: 'ami-05b10e08d247fb927',
      instanceType: 't2.micro',
      subnetId: subnet1.attrSubnetId,
      securityGroupIds: [securityGroup.attrId],
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'IMDSv1' },
      ],
    });

    new CfnInstance(this, 'IMDSv2', {
      imageId: 'ami-05b10e08d247fb927',
      instanceType: 't2.micro',
      subnetId: subnet1.attrSubnetId,
      securityGroupIds: [securityGroup.attrId],
      userData: Fn.base64(userData.render()),
      tags: [
        { key: 'project', value: 'myapp' },
        { key: 'Name', value: 'IMDSv2' },
      ],
    });
  }
}
