import { Fn, Size, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
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
  EbsDeviceVolumeType, 
  UserData, 
  Volume 
} from 'aws-cdk-lib/aws-ec2';

export class Lab3 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Launch two instances in separate AZs, attach a 10GB EBS volume, and migrate it via snapshot.';

    //* Create VPC
    const vpc = new CfnVPC(this, 'MyVPC', {
      cidrBlock: '10.0.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      instanceTenancy: 'default',
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MyVpc'}]
    })

    //* Create Subnets
    const subnet1 = new CfnSubnet(this, 'MySubnet-1', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.1.0/24',
      availabilityZone: 'us-east-1a',
      mapPublicIpOnLaunch: true,
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MySubnet-1'}]
    })

    const subnet2 = new CfnSubnet(this, 'MySubnet-2', {
      vpcId: vpc.attrVpcId,
      cidrBlock: '10.0.2.0/24',
      availabilityZone: 'us-east-1b',
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MySubnet-2'}]
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

    //* Add EBS Volume
    const ebs = new Volume(this, 'MyEBS', {
      volumeName: 'MyEBS',
      volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3,
      size: Size.gibibytes(10),
      iops: 3000,
      throughput: 125,
      availabilityZone: 'us-east-1a',
    })

    const securityGroup = new CfnSecurityGroup(this, 'MySG', {
      vpcId: vpc.attrVpcId,
      groupName: 'SGWebAccess',
      groupDescription: 'SG for my custom VPC',
      securityGroupIngress: [{
        ipProtocol: 'tcp',
        toPort: 22,
        fromPort: 22,
        cidrIp: '0.0.0.0/0',
        description: 'anywhere rule :p',
      }],
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'WebAccessMyVPC'}]
    })

    const userData = UserData.forLinux();
    userData.addCommands(
      'sudo mkfs -t ext4 /dev/xvdy',
      'sudo mkdir /home/ec2-user/data',
      'sudo mount /dev/xvdy /data',
      'sudo echo "UUID=$(blkid -s UUID -o value /dev/xvdy) /data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab',
    );
    
    //* Create Ec2 Instance
    new CfnInstance(this, 'MyInstace-1', {
      imageId: 'ami-05b10e08d247fb927',
      instanceType: 't2.micro',
      subnetId: subnet1.attrSubnetId,
      securityGroupIds: [securityGroup.attrId],
      volumes: [{
        device: '/dev/sdy',
        volumeId: ebs.volumeId,
      }],
      userData: Fn.base64(userData.render()),
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'MyInstace-1'}]
    })
  }
}