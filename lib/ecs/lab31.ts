import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import {
  Cluster,
  ContainerImage,
  DeploymentControllerType,
  FargateService,
  FargateTaskDefinition,
  Protocol,
} from 'aws-cdk-lib/aws-ecs';
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  TargetType,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { DockerImageName, ECRDeployment } from 'cdk-ecr-deployment';
import { Construct } from 'constructs';

export class Lab31 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'AWS Fargate Blue-Green CI/CD Pipeline - Part 3 | Create ECS Cluster and Fargate Service';

    //* Create Image and Push to ECR Repository
    const repository = new Repository(this, 'NginxRepository', {
      repositoryName: 'mynginx',
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const imageAsset = new DockerImageAsset(this, 'NginxImageAsset', {
      directory: path.join(__dirname, 'files'),
    });

    const ecrDeployment = new ECRDeployment(this, 'DeployNginxImage', {
      src: new DockerImageName(imageAsset.imageUri),
      dest: new DockerImageName(
        `${repository.repositoryUri}:${imageAsset.assetHash}`,
      ),
    });

    //* Create ALB
    const vpc = Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    const subnets = vpc.selectSubnets({
      subnetType: SubnetType.PUBLIC,
      availabilityZones: ['us-east-1a', 'us-east-1b'],
    });

    const albSg = new SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for the ALB',
      allowAllOutbound: true,
    });

    albSg.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP traffic');
    albSg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(8080),
      'Allow HTTP 8080 traffic',
    );
    albSg.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'Allow SSH traffic');

    const alb = new ApplicationLoadBalancer(this, 'MyAlb', {
      vpc,
      internetFacing: true,
      vpcSubnets: subnets,
      securityGroup: albSg,
    });

    const targetGroup80 = new ApplicationTargetGroup(this, 'TG80', {
      vpc,
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      targetType: TargetType.IP,
      healthCheck: {
        path: '/',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
      },
    });

    const targetGroup8080 = new ApplicationTargetGroup(this, 'TG8080', {
      vpc,
      port: 8080,
      protocol: ApplicationProtocol.HTTP,
      targetType: TargetType.IP,
      healthCheck: {
        path: '/',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
      },
    });

    alb.addListener('Listener80', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup80],
    });

    alb.addListener('Listener8080', {
      port: 8080,
      protocol: ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup8080],
    });

    //* Create Fargate Task Definition

    const myTask = new FargateTaskDefinition(this, 'MyTaskDef', {
      family: 'ecs-lab',
      cpu: 256,
      memoryLimitMiB: 512,
    });

    myTask.addContainer('SampleWebsiteContainer', {
      containerName: 'sample-website',
      image: ContainerImage.fromEcrRepository(repository, imageAsset.assetHash),
      essential: true,
      portMappings: [{ containerPort: 80, protocol: Protocol.TCP }],
    });

    //* Create ECS Cluster and Fargate Service
    const cluster = new Cluster(this, 'MyCluster', {
      clusterName: 'ecs-cluster',
      vpc,
    });

    const fargateSg = new SecurityGroup(this, 'FargateSecurityGroup', {
      vpc,
      description: 'Security group for the Fargate service',
      allowAllOutbound: true,
    });

    const fargateService = new FargateService(this, 'MyFargateService', {
      cluster,
      taskDefinition: myTask,
      desiredCount: 1,
      vpcSubnets: subnets,
      securityGroups: [fargateSg],
      assignPublicIp: true,
      minHealthyPercent: 100,
      deploymentController: {
        type: DeploymentControllerType.CODE_DEPLOY,
      },
    });

    fargateService.attachToApplicationTargetGroup(targetGroup80);

    myTask.node.addDependency(ecrDeployment);

    new CfnOutput(this, 'NginxImageUri', {
      value: `${repository.repositoryUri}:${imageAsset.assetHash}`,
      description: 'The full URI of the nginx image in our repository',
    });
  }
}
