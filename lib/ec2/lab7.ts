import fs from 'node:fs';
import { Construct } from 'constructs';
import { AmazonLinux2023ImageSsmParameter, CfnInternetGateway, CfnLaunchTemplate, CfnRoute, CfnRouteTable, CfnSecurityGroup, CfnSubnet, CfnSubnetRouteTableAssociation, CfnVPC, CfnVPCGatewayAttachment, InstanceClass, InstanceSize, UserData } from 'aws-cdk-lib/aws-ec2';
import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import { CfnAutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';

export class Lab7 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Provision an Auto Scaling Group with a Launch Template deploying T2.micro instances using a custom user-data script on Amazon Linux 2023.'

    //* Create VPC
    const vpc = new CfnVPC(this, 'MyVPC', {
      cidrBlock: '10.0.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      instanceTenancy: 'default',
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MyVpc'}]
    })

    //* Create Subnets
    const subnet1 = new CfnSubnet(this, 'MySubnet1', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.1.0/24',
      availabilityZone: 'us-east-1a',
      mapPublicIpOnLaunch: true,
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MySubnet1'}]
    })

    const subnet2 = new CfnSubnet(this, 'MySubnet2', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.2.0/24',
      availabilityZone: 'us-east-1b',
      mapPublicIpOnLaunch: true,
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MySubnet2'}]
    })

    //* Create Public Route Table
    const route = new CfnRouteTable(this, 'MyPublic-RT', {
      vpcId: vpc.attrVpcId,
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MyPublic-RT'}]
    })

    //* Attach Route table to subnets
    new CfnSubnetRouteTableAssociation(this, 'AttachRtToSubnet1', {
      subnetId: subnet1.attrSubnetId,
      routeTableId: route.attrRouteTableId,
    })

    new CfnSubnetRouteTableAssociation(this, 'AttachRtToSubnet2', {
      subnetId: subnet2.attrSubnetId,
      routeTableId: route.attrRouteTableId,
    })

    //* Create Internet Gateway
    const igw = new CfnInternetGateway(this, 'MyIGW', {
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MyIGW'}]
    })

    //* Attach IGW to VPC
    new CfnVPCGatewayAttachment(this, 'AttachVpcToIgw', {
      vpcId: vpc.attrVpcId,
      internetGatewayId: igw.attrInternetGatewayId,
    })

    //* Add new route to route table
    new CfnRoute(this, 'IgwRoute', {
      routeTableId: route.attrRouteTableId,
      destinationCidrBlock: '0.0.0.0/0',
      gatewayId: igw.attrInternetGatewayId,
    })

    //* Create Security group
    const securityGroup = new CfnSecurityGroup(this, 'MySG', {
      vpcId: vpc.attrVpcId,
      groupName: 'StorageLabs',
      groupDescription: 'Temporary SG for the Storage Service Labs',
      securityGroupIngress: [{
        ipProtocol: 'tcp',
        toPort: 22,
        fromPort: 22,
        cidrIp: '0.0.0.0/0',
        description: 'SSH Access',
      }, {
        ipProtocol: 'tcp',
        toPort: 80,
        fromPort: 80,
        cidrIp: '0.0.0.0/0',
        description: 'HTTP Access',
      }],
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'StorageLabs'}]
    })

    //* Read script
    const scriptContent = fs.readFileSync('scripts/ex7.sh', 'utf8');

    //* Create linux commands
    const userData = UserData.forLinux();
    userData.addCommands(scriptContent);

    const launchTemplate = new CfnLaunchTemplate(this, 'MyLaunchTemplate', {
      launchTemplateName: 'MyLaunchTemplate',
      tagSpecifications: [{
        resourceType: 'launch-template',
        tags: [{ key: 'project', value: 'myapp' }]
      }],
      launchTemplateData: {
        imageId: new AmazonLinux2023ImageSsmParameter().getImage(this).imageId, //* Get latest default 2023 ami-id
        instanceType: `${InstanceClass.T2}.${InstanceSize.MICRO}`,
        securityGroupIds: [securityGroup.attrId],
        userData: Fn.base64(userData.render()),
      }
    })

    new CfnAutoScalingGroup(this, 'MySCG', {
      maxSize: '2',
      minSize: '2',
      autoScalingGroupName: 'MySCG',
      launchTemplate: {
        version: '1',
        launchTemplateId: launchTemplate.attrLaunchTemplateId,
      },
      vpcZoneIdentifier: [subnet1.attrSubnetId, subnet2.attrSubnetId],
      healthCheckGracePeriod: 300,
      desiredCapacity: '2',
    })   
  }
}