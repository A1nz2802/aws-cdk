import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import {
  DefaultInstanceTenancy,
  IpAddresses,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class Lab1 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'Simple VPC';

    const vpc = new Vpc(this, 'MyVPC', {
      ipAddresses: IpAddresses.cidr('10.1.0.0/16'),
      createInternetGateway: false,
      availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
      enableDnsHostnames: true,
      enableDnsSupport: true,
      defaultInstanceTenancy: DefaultInstanceTenancy.DEFAULT,
      subnetConfiguration: [
        {
          name: 'public-sub',
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private-sub',
          subnetType: SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      natGateways: 0,
      //maxAzs: 3,
      restrictDefaultSecurityGroup: false,
    });

    Tags.of(vpc).add('project', 'myapp');
  }
}
