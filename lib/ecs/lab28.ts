import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
  DefaultInstanceTenancy,
  InstanceClass,
  InstanceSize,
  InstanceType,
  IpAddresses,
  KeyPair,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  ContainerImage,
  Ec2Service,
  Ec2TaskDefinition,
  EcsOptimizedImage,
  NetworkMode,
  Protocol,
} from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class Lab28 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Deploys a load-balanced Nginx container on an ECS Cluster using the EC2 launch type.';

    //* Create VPC
    const vpc = new Vpc(this, 'MyVPC', {
      vpcName: 'MyVPC',
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
      ],
      natGateways: 0,
      restrictDefaultSecurityGroup: false,
    });

    const sg = new SecurityGroup(this, 'MySG', {
      vpc,
      securityGroupName: 'MySG',
      description: 'SG for ecs lab',
      allowAllOutbound: true,
    });

    sg.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'SSH Access');
    sg.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'HTTP Access');

    //* Create ECS Cluster
    const myKey = KeyPair.fromKeyPairAttributes(this, 'MyKey', {
      keyPairName: 'EcsLabKeyv2',
    });

    // The ECS Cluster is a logical grouping of tasks or services.
    // It provides a namespace for our application and manages the container instances.
    const myCluster = new Cluster(this, 'MyCluster', {
      clusterName: 'myecs-cluster',
      vpc,
    });

    // Adds compute capacity (an EC2 instance managed by an Auto Scaling Group) to the cluster.
    // This is the actual virtual machine where our containers will run.
    const myCapacity = myCluster.addCapacity('MyCapacity', {
      keyPair: myKey,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: EcsOptimizedImage.amazonLinux2023(), //! make sure you use the correct ECS AMI.
      maxCapacity: 1,
      vpcSubnets: vpc,
    });

    const myTask = new Ec2TaskDefinition(this, 'MyTaskDefinition', {
      family: 'MyNginx',
      networkMode: NetworkMode.AWS_VPC,
    });

    const containerName = 'NginxContainer';

    myTask.addContainer(containerName, {
      image: ContainerImage.fromRegistry('nginx:latest'),
      memoryLimitMiB: 512,
      portMappings: [{ containerPort: 80, protocol: Protocol.TCP }],
    });

    const myService = new Ec2Service(this, 'MyService', {
      serviceName: 'MyService',
      cluster: myCluster,
      taskDefinition: myTask,
      desiredCount: 1,
      minHealthyPercent: 100,
    });

    myCapacity.addSecurityGroup(sg);
    myCapacity.addUserData('sudo yum install -y ec2-instance-connect');

    const lb = new ApplicationLoadBalancer(this, 'MyLB', {
      loadBalancerName: 'MyLB',
      vpc,
      internetFacing: true,
    });
    const listener = lb.addListener('PublicListener', { port: 80, open: true });

    listener.addTargets('ECS', {
      port: 8080,
      targets: [
        myService.loadBalancerTarget({
          containerName,
          containerPort: 80,
        }),
      ],
      healthCheck: {
        interval: Duration.seconds(60),
        path: '/health',
        timeout: Duration.seconds(5),
      },
    });
  }
}
