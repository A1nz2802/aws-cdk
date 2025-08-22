import { Stack, StackProps } from 'aws-cdk-lib';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeStarConnectionsSourceAction,
  ElasticBeanstalkDeployAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';
import {
  CfnApplication,
  CfnEnvironment,
} from 'aws-cdk-lib/aws-elasticbeanstalk';
import {
  InstanceProfile,
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class Lab32 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'CD example using AWS CodePipeline to deploy a Node.js application from GitHub to an AWS Elastic Beanstalk environment.';

    const githubOwner = 'A1nz2802';
    const githubRepo = 'some-test';
    const githubBranch = 'main';
    const connectionArn = process.env.CONNECTION_ARN;

    const ebRole = new Role(this, 'MyRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      roleName: 'MyRole',
    });

    ebRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
    );

    const instanceProfile = new InstanceProfile(this, 'MyInstanceRole', {
      role: ebRole,
      instanceProfileName: 'MyInstanceRole',
    });

    const appName = 'MyGitHubWebApp';

    const ebApp = new CfnApplication(this, 'EBApplication', {
      applicationName: appName,
      description: 'Simple Webapp',
    });

    const myEnv = new CfnEnvironment(this, 'MyEBEnvironment', {
      applicationName: appName,
      environmentName: 'MyEBEnvironment',
      tier: {
        name: 'WebServer',
        type: 'Standard',
      },
      solutionStackName: '64bit Amazon Linux 2023 v6.6.3 running Node.js 22',
      optionSettings: [
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'IamInstanceProfile',
          value: instanceProfile.instanceProfileArn,
        },
        {
          namespace: 'aws:ec2:instances',
          optionName: 'EnableSpot',
          value: 'true',
        },
        {
          namespace: 'aws:ec2:instances',
          optionName: 'InstanceTypes',
          value: 't2.micro',
        },
      ],
    });

    myEnv.addDependency(ebApp);

    const sourceOutput = new Artifact();

    const myPipeline = new Pipeline(this, 'MyWebAppPipeline', {
      pipelineName: 'GitHub-to-Beanstalk-Pipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [
            new CodeStarConnectionsSourceAction({
              actionName: 'GitHub_Source',
              owner: githubOwner,
              repo: githubRepo,
              branch: githubBranch,
              connectionArn: connectionArn!,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new ElasticBeanstalkDeployAction({
              actionName: 'Deploy_to_ElasticBeanstalk',
              applicationName: appName,
              environmentName: myEnv.environmentName!,
              input: sourceOutput,
            }),
          ],
        },
      ],
    });

    myPipeline.node.addDependency(myEnv);
  }
}
