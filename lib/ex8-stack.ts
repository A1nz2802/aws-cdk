import fs from 'node:fs';
import { Construct } from 'constructs';
import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import { CfnAutoScalingGroup, CfnScalingPolicy } from 'aws-cdk-lib/aws-autoscaling';
import { AmazonLinux2023ImageSsmParameter, CfnInternetGateway, CfnLaunchTemplate, CfnRoute, CfnRouteTable, CfnSecurityGroup, CfnSubnet, CfnSubnetRouteTableAssociation, CfnVPC, CfnVPCGatewayAttachment, InstanceClass, InstanceSize, UserData } from 'aws-cdk-lib/aws-ec2';
import { CfnTargetGroup, TargetGroupIpAddressType, TargetType, Protocol, ApplicationProtocolVersion, CfnLoadBalancer, IpAddressType, CfnListener } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { HealthCheckProtocol } from 'aws-cdk-lib/aws-globalaccelerator';

export class Ex8Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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

    const subnet3 = new CfnSubnet(this, 'MySubnet3', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.3.0/24',
      availabilityZone: 'us-east-1c',
      mapPublicIpOnLaunch: true,
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MySubnet3'}]
    })

    const subnet4 = new CfnSubnet(this, 'MySubnet4', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.4.0/24',
      availabilityZone: 'us-east-1d',
      mapPublicIpOnLaunch: true,
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MySubnet4'}]
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

    new CfnSubnetRouteTableAssociation(this, 'AttachRtToSubnet3', {
      subnetId: subnet3.attrSubnetId,
      routeTableId: route.attrRouteTableId,
    })

    new CfnSubnetRouteTableAssociation(this, 'AttachRtToSubnet4', {
      subnetId: subnet4.attrSubnetId,
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

    //* Create launch template
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

    //* Create ELB
    const myElb = new CfnLoadBalancer(this, 'MyELB', {
      name: 'MyELB',
      type: 'application',
      ipAddressType: IpAddressType.IPV4,
      subnetMappings: [{
        subnetId: subnet1.attrSubnetId,
      }, {
        subnetId: subnet2.attrSubnetId
      }, {
        subnetId: subnet3.attrSubnetId,
      }, {
        subnetId: subnet4.attrSubnetId,
      }],
      securityGroups: [securityGroup.attrId],
      tags: [{key: 'project', value: 'myapp'}],
    })

    //* Create target group
    const targetGroup = new CfnTargetGroup(this, 'MyTargetGroup', {
      vpcId: vpc.attrVpcId,
      name: 'MyTargetGroup',
      targetType: TargetType.INSTANCE,
      protocolVersion: ApplicationProtocolVersion.HTTP1,
      protocol: Protocol.HTTP,
      port: 80,
      ipAddressType: TargetGroupIpAddressType.IPV4,
      healthCheckProtocol: HealthCheckProtocol.HTTP,
      healthCheckPath: '/',
      tags: [{key: 'project', value: 'myapp'}],
    })

    //* Create Listener
    const listener = new CfnListener(this, 'MyListener', {
      loadBalancerArn: myElb.attrLoadBalancerArn,
      port: 80,
      protocol: Protocol.HTTP,
      defaultActions: [{
        type: 'forward',
        targetGroupArn: targetGroup.attrTargetGroupArn,
      }],
    })
    
    //* Create AutoScalingGroup
    const myAutoScalingGroup = new CfnAutoScalingGroup(this, 'MySCG', {
      maxSize: '4',
      minSize: '1',
      autoScalingGroupName: 'MySCG',
      launchTemplate: {
        version: '1',
        launchTemplateId: launchTemplate.attrLaunchTemplateId,
      },
      vpcZoneIdentifier: [subnet1.attrSubnetId, subnet2.attrSubnetId, subnet3.attrSubnetId, subnet4.attrSubnetId],
      healthCheckGracePeriod: 300,
      desiredCapacity: '2',
      targetGroupArns: [targetGroup.attrTargetGroupArn],
    })

    myAutoScalingGroup.node.addDependency(listener);
    myAutoScalingGroup.node.addDependency(targetGroup);
    
    const scalingPolicy = new CfnScalingPolicy(this, 'MyScalingPolicy', {
      autoScalingGroupName: myAutoScalingGroup.autoScalingGroupName!,
      policyType: 'TargetTrackingScaling',
      targetTrackingConfiguration: {
        targetValue: 50,
        predefinedMetricSpecification: {
          predefinedMetricType: 'ALBRequestCountPerTarget',
          resourceLabel: Fn.join('/', [
            Fn.select(1, Fn.split('loadbalancer/', myElb.attrLoadBalancerArn)),
            'targetgroup',
            Fn.select(1, Fn.split('targetgroup/', targetGroup.attrTargetGroupArn))
          ]),
        },
      },
      estimatedInstanceWarmup: 300,
    });

    scalingPolicy.node.addDependency(listener);
    scalingPolicy.node.addDependency(myAutoScalingGroup);
  }
}

// for i in {1..200}; do curl MyELB-540885165.us-east-1.elb.amazonaws.com & done; wait    bash

// for i in (seq 1 200); curl MyELB-540885165.us-east-1.elb.amazonaws.com &; end; wait    fish