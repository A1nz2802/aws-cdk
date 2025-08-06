import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Stack, StackProps } from 'aws-cdk-lib';
import {
  Deployment,
  EndpointType,
  LambdaIntegration,
  Resource,
  RestApi,
  Stage,
} from 'aws-cdk-lib/aws-apigateway';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class Lab25 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description =
      'Apigateway REST API with a Lambda proxy integration.';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const myLambda = new Function(this, 'MyLambda25', {
      functionName: 'MyLambda25',
      description: 'Simple lambda function',
      runtime: Runtime.PYTHON_3_13,
      architecture: Architecture.X86_64,
      code: Code.fromAsset(path.join(__dirname, 'files-lab25')),
      handler: 'index.lambda_handler',
    });

    const myApi = new RestApi(this, 'MyApiGateway', {
      restApiName: 'MyApiGateway',
      endpointTypes: [EndpointType.REGIONAL],
      deploy: false,
    });

    const myLambdaIntegration = new LambdaIntegration(myLambda, {
      proxy: true,
    });

    const helloResource: Resource = myApi.root.addResource('helloworld');
    helloResource.addMethod('ANY', myLambdaIntegration);

    const myDeployment = new Deployment(this, 'MyDeployment', {
      api: myApi,
    });

    new Stage(this, 'MyStage', {
      stageName: 'prod',
      deployment: myDeployment,
    });
  }
}
