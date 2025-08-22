import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeBuildAction,
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
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class Lab33 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = '';

    const githubOwner = 'A1nz2802';
    const githubRepo = 'some-test';
    const githubBranch = 'main';
    const connectionArn = process.env.CONNECTION_ARN;

    const ebRole = new Role(this, 'MyRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      roleName: 'MyRole',
    });

    const ebServiceRole = new Role(this, 'MyServiceRole', {
      assumedBy: new ServicePrincipal('elasticbeanstalk.amazonaws.com'),
    });
    ebServiceRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy',
      ),
    );

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
    const buildOutput = new Artifact('BuildOutput');

    const artifactBucket = new Bucket(this, 'MyBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const buildProject = new PipelineProject(this, 'MyBuildProject', {
      projectName: 'MyWebAppBuildProject',
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
    });

    const myPipeline = new Pipeline(this, 'MyWebAppPipeline', {
      pipelineName: 'GitHub-to-Beanstalk-Pipeline',
      artifactBucket,
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
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'Build_and_Test',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
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
              input: buildOutput,
            }),
          ],
        },
      ],
    });

    //! The action failed because either the artifact or the Amazon S3 bucket could not be found. Name of artifact bucket: lab-30-xxxxx. Verify that this bucket exists. If it exists, check the life cycle policy, then try releasing a change.

    myPipeline.artifactBucket.grantRead(ebServiceRole);

    myPipeline.node.addDependency(myEnv);
  }
}
