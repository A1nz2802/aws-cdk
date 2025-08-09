import { Stack, StackProps } from 'aws-cdk-lib';
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
import { Construct } from 'constructs';

export class Lab27 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'ECS Cluster with EC2 capacity to run a simple Nginx web server task.';

    //* Create VPC
    const vpc = new Vpc(this, 'MyVPC', {
      vpcName: 'MyVPC',
      ipAddresses: IpAddresses.cidr('10.1.0.0/16'),
      createInternetGateway: true,
      availabilityZones: ['us-east-1a'],
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
    const ecsClusterName = 'myecs-cluster';
    const myKey = KeyPair.fromKeyPairAttributes(this, 'MyKey', {
      keyPairName: 'EcsLabKeyv2',
    });

    // The ECS Cluster is a logical grouping of tasks or services.
    // It provides a namespace for our application and manages the container instances.
    const myCluster = new Cluster(this, 'MyCluster', {
      clusterName: ecsClusterName,
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

    // The Task Definition is the blueprint for our application.
    // It defines what containers to run, memory/CPU requirements, and network settings.
    const myTask = new Ec2TaskDefinition(this, 'MyTaskDefinition', {
      family: 'MyNginx',
      networkMode: NetworkMode.BRIDGE, // BRIDGE mode allows direct port mapping from host to container.
    });

    // Defines the specific container to run within the task.
    // It specifies the Docker image, memory limits, and other container-level settings.
    myTask.addContainer('NginxContainer', {
      image: ContainerImage.fromRegistry('nginx:latest'),
      memoryLimitMiB: 256,
      portMappings: [
        { containerPort: 80, hostPort: 80, protocol: Protocol.TCP },
      ],
    });

    // The ECS Service is responsible for maintaining the desired number of instances of a task definition.
    // It ensures our Nginx container is always running by launching tasks on the cluster's capacity.
    new Ec2Service(this, 'MyService', {
      serviceName: 'MyService',
      cluster: myCluster,
      taskDefinition: myTask,
      desiredCount: 1, // We want one copy of our Nginx task running.
    });

    myCapacity.addSecurityGroup(sg);
    myCapacity.addUserData('sudo yum install -y ec2-instance-connect');
  }
}
