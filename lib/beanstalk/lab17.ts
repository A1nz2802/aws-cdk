import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  CfnKeyPair,
  DefaultInstanceTenancy,
  IpAddresses,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import {
  CfnApplication,
  CfnApplicationVersion,
  CfnEnvironment,
} from 'aws-cdk-lib/aws-elasticbeanstalk';
import {
  CfnInstanceProfile,
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class Lab17 extends Stack {
  //* Retrieve latest Node.js 22 platform version
  private getNode22Platform() {
    try {
      const command = [
        'aws elasticbeanstalk list-available-solution-stacks',
        "--query \"SolutionStacks[?contains(@, 'Node.js 22') && contains(@, 'Amazon Linux 2023')]\"",
        '--output text | sort -r | head -1',
      ].join(' ');

      const platform = execSync(command).toString().trim();

      if (!platform) {
        throw new Error('Platform not fount');
      }

      console.log(platform);

      return platform;
    } catch (error) {
      if (error instanceof Error) {
        throw new TypeError(`Error ocurred getting platform: ${error.message}`);
      }
    }
  }

  //! Make sure the container has ssh-keygen
  //* Generate local SSH key pair for EC2 access
  private generateLocalEc2KeyPair() {
    const keyName = 'beanstalk-key';
    execSync(`ssh-keygen -t rsa -b 4096 -f ${keyName} -N ''`);
    const publicKey = fs.readFileSync(`${keyName}.pub`, 'utf8');

    return publicKey;
  }

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Create Elastic Beanstalk Web Application';

    //* Elastic Beanstalk application configuration
    const beanstalkApp = new CfnApplication(this, 'WebApp1', {
      applicationName: 'WebApp1',
      description: 'Simple Webapp',
    });

    const webSiteBucket = new Bucket(this, 'my-static-website-bucket', {
      bucketName: 'my-static-website-5wyasda9',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const deployment = new BucketDeployment(this, 'DeployWebsite', {
      destinationBucket: webSiteBucket,
      sources: [Source.asset(path.join(__dirname, 'files'))],
    });

    const appVersion = new CfnApplicationVersion(this, 'MyApp', {
      applicationName: beanstalkApp.applicationName || 'WebApp1',
      sourceBundle: {
        s3Bucket: webSiteBucket.bucketName,
        s3Key: 'nodejs.zip',
      },
    });

    appVersion.node.addDependency(deployment);

    //* IAM role for Beanstalk operations
    const myRole = new Role(this, 'BeanstalkOperationsRole', {
      roleName: 'BeanstalkServiceRole',
      assumedBy: new ServicePrincipal('elasticbeanstalk.amazonaws.com'),
      managedPolicies: [
        /* ManagedPolicy.fromAwsManagedPolicyName(
          'AWSElasticBeanstalkEnhancedHealth',
        ), */
        ManagedPolicy.fromAwsManagedPolicyName(
          'AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy',
        ),
      ],
    });

    const ec2Role = new Role(this, 'Ec2Role', {
      roleName: 'BeanstalkEC2Role',
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
    });

    const myProfile = new CfnInstanceProfile(this, 'MyInstanceProfile', {
      instanceProfileName: 'BeanstalkInstanceProfile',
      roles: [ec2Role.roleName],
    });

    //* EC2 SSH key pair configuration
    const keyPair = new CfnKeyPair(this, 'BeanstalkKeyPair', {
      keyName: 'beanstalk-key',
      keyType: 'rsa',
      keyFormat: 'pem',
    });

    const vpc = new Vpc(this, 'MyVPC', {
      ipAddresses: IpAddresses.cidr('10.1.0.0/16'),
      createInternetGateway: true,
      availabilityZones: ['us-east-1a', 'us-east-1b'],
      enableDnsHostnames: true,
      enableDnsSupport: true,
      defaultInstanceTenancy: DefaultInstanceTenancy.DEFAULT,
      subnetConfiguration: [
        {
          name: 'public-sub-1',
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
          cidrMask: 24,
        },
        {
          name: 'public-sub-2',
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
          cidrMask: 24,
        },
      ],
      natGateways: 0,
      restrictDefaultSecurityGroup: false,
    });

    const sg = new SecurityGroup(this, 'BeanstalkSG', {
      vpc,
      description: 'SG for Beanstalk',
      allowAllOutbound: true,
    });

    sg.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'HTTP Access');
    sg.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'SSH Access');

    //* Beanstalk environment configuration
    //! For some reason this code doesn't works.
    //! https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-autoscaling-launch-templates.html
    //! Don't use Launch Configurations, use Launch Templates instead
    const ebEnv = new CfnEnvironment(this, 'Dev-env', {
      environmentName: 'Dev-env',
      applicationName: beanstalkApp.applicationName || 'MyApp',
      description: 'Simple development environment',
      cnamePrefix: 'a1nzdev28app',
      solutionStackName: this.getNode22Platform(),
      operationsRole: myRole.roleArn,
      versionLabel: appVersion.ref,
      tier: {
        name: 'WebServer',
        type: 'Standard',
      },
      optionSettings: [
        /* {
          namespace: 'aws:ec2:vpc',
          optionName: 'VPCId',
          value: vpc.vpcId,
        },
        {
          namespace: 'aws:ec2:vpc',
          optionName: 'Subnets',
          value: vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
        },
        {
          namespace: 'aws:ec2:instances',
          optionName: 'InstanceTypes',
          value: 't2.micro',
        }, */
        {
          namespace: 'aws:ec2:instances',
          optionName: 'EnableSpot',
          value: 'true',
        },
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'DisableIMDSv1',
          value: 'true',
        },
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'RootVolumeType',
          value: 'gp3',
        },
        /* {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'SecurityGroups',
          value: sg.securityGroupId,
        },
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'EC2KeyName',
          value: keyPair.keyName,
        },
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'IamInstanceProfile',
          value: myProfile.instanceProfileName,
        }, */
        /* {
          namespace: 'aws:elasticbeanstalk:environment',
          optionName: 'EnvironmentType',
          value: 'SingleInstance',
        },
        {
          namespace: 'aws:elasticbeanstalk:healthreporting:system',
          optionName: 'SystemType',
          value: 'basic',
        },
        {
          namespace: 'aws:elasticbeanstalk:managedactions',
          optionName: 'ManagedActionsEnabled',
          value: 'false',
        }, */
      ],
    });

    ebEnv.node.addDependency(vpc);
    ebEnv.node.addDependency(keyPair);
    ebEnv.node.addDependency(sg);
    ebEnv.node.addDependency(myProfile);
  }
}
