import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { DockerImageName, ECRDeployment } from 'cdk-ecr-deployment';
import { Construct } from 'constructs';

export class Lab29 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'AWS Fargate Blue-Green CI/CD Pipeline - Part 1 | Create Image and Push to ECR Repository';

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

    new ECRDeployment(this, 'DeployNginxImage', {
      src: new DockerImageName(imageAsset.imageUri),
      dest: new DockerImageName(
        `${repository.repositoryUri}:${imageAsset.assetHash}`,
      ),
    });

    new CfnOutput(this, 'NginxImageUri', {
      value: `${repository.repositoryUri}:${imageAsset.assetHash}`,
      description: 'The full URI of the nginx image in our repository',
    });
  }
}
