/* 

# IMDS v1

## Example commmands to run:

1. Get the instance ID:
curl http://169.254.169.254/latest/meta-data/instance-id

2. Get the AMI ID:
curl http://169.254.169.254/latest/meta-data/ami-id

3. Get the instance type:
curl http://169.254.169.254/latest/meta-data/instance-type

4. Get the local IPv4 address:
curl http://169.254.169.254/latest/meta-data/local-ipv4

5. Get the public IPv4 address:
curl http://169.254.169.254/latest/meta-data/public-ipv4


# IMDS v2

## Step 1 - Create a session and get a token

TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

## Step 2 - Use the token to request metadata

1. Get the instance ID:
curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id

2. Get the AMI ID:
curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/ami-id

# Use metadata with user data to configure the instance

This script installs a web server and uses instance metadata to retrieve information about the instance and then output the information on a webpage.

```bash
#!/bin/bash

# Update system and install httpd (Apache)
yum update -y
yum install -y httpd

# Start httpd service and enable it to start on boot
systemctl start httpd
systemctl enable httpd

# Fetch metadata using IMDSv2
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
AMI_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/ami-id)
INSTANCE_TYPE=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-type)

# Create a web page to display the metadata
cat <<EOF > /var/www/html/index.html
<html>
<head>
    <title>EC2 Instance Metadata</title>
</head>
<body>
    <h1>EC2 Instance Metadata</h1>
    <p>Instance ID: $INSTANCE_ID</p>
    <p>AMI ID: $AMI_ID</p>
    <p>Instance Type: $INSTANCE_TYPE</p>
</body>
</html>
EOF
```

*/

import fs from 'node:fs';
import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnInstance, CfnInternetGateway, CfnLaunchTemplate, CfnRoute, CfnRouteTable, CfnSecurityGroup, CfnSubnet, CfnSubnetRouteTableAssociation, CfnVPC, CfnVPCGatewayAttachment, LaunchTemplateHttpTokens, UserData } from 'aws-cdk-lib/aws-ec2';

export class Lab5 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Retrieve instance metadata using IMDS v1 and v2, and display it on a web page via a user-data script.'

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
    
    //! Environment variables are not persist in post-build instance
    const scriptContent = fs.readFileSync('scripts/ex5.sh', 'utf8');

    const userData = UserData.forLinux();
    userData.addCommands(scriptContent);

    //! IMDSv2 is required by default
    const launchTemplate = new CfnLaunchTemplate(this, 'MakeIMDSv2Optional', {
      launchTemplateData: {
        metadataOptions: {
          httpTokens: LaunchTemplateHttpTokens.OPTIONAL,
        }
      }
    })

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
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'IMDSv1'}]
    })

    new CfnInstance(this, 'IMDSv2', {
      imageId: 'ami-05b10e08d247fb927',
      instanceType: 't2.micro',
      subnetId: subnet1.attrSubnetId,
      securityGroupIds: [securityGroup.attrId],
      userData: Fn.base64(userData.render()),
      tags: [{key: 'project', value: 'myapp'}, {key: 'Name', value: 'IMDSv2'}]
    })
  }
}