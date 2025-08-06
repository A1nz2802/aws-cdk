import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Stack, StackProps } from 'aws-cdk-lib';
import {
  EndpointType,
  LambdaIntegration,
  PassthroughBehavior,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class Lab26 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = '';

    // Create role
    const myRole = new Role(this, 'MyRole', {
      roleName: 'lambda-apigateway-role',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        LambdaApigatewayPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              sid: 'Stmt1428341300017',
              actions: [
                'dynamodb:DeleteItem',
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:UpdateItem',
              ],
              effect: Effect.ALLOW,
              resources: ['*'],
            }),
            new PolicyStatement({
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              effect: Effect.ALLOW,
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Create lambda function
    const myLambda = new Function(this, 'MyLambda25', {
      functionName: 'LambdaFunctionOverHttps',
      description: 'Simple lambda function',
      runtime: Runtime.PYTHON_3_13,
      architecture: Architecture.X86_64,
      code: Code.fromAsset(path.join(__dirname, 'files-lab26')),
      handler: 'index.lambda_handler',
      role: myRole,
    });

    // Integration Request mapping template
    const requestTemplate = `$input.json('$')`;

    // Integration Response mapping templates
    const responseTemplate = `$input.json('$')`;

    // Error response template for 400 status
    const errorResponseTemplate = `$input.json('$')`;

    const myLambdaIntegration = new LambdaIntegration(myLambda, {
      proxy: false,
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': requestTemplate,
      },
      integrationResponses: [
        // Success response (200)
        {
          statusCode: '200',
          responseTemplates: {
            'application/json': responseTemplate,
          },
          responseParameters: {
            'method.response.header.Content-Type': "'application/json'",
          },
        },
        // Error response (400)
        {
          statusCode: '400',
          // eslint-disable-next-line no-useless-escape
          selectionPattern: '.*"statusCode":\s*400.*',
          responseTemplates: {
            'application/json': errorResponseTemplate,
          },
          responseParameters: {
            'method.response.header.Content-Type': "'application/json'",
          },
        },
        // Internal server error (500)
        {
          statusCode: '500',
          // eslint-disable-next-line no-useless-escape
          selectionPattern: '.*"statusCode":\s*500.*',
          responseTemplates: {
            'application/json': '{"error": "Internal server error"}',
          },
          responseParameters: {
            'method.response.header.Content-Type': "'application/json'",
          },
        },
      ],
    });

    // Create Rest API
    const myApi = new RestApi(this, 'MyApiGateway', {
      restApiName: 'DynamoDBOperations',
      endpointTypes: [EndpointType.REGIONAL],
    });

    const myResource = myApi.root.addResource('dynamodbmanager');

    myResource.addMethod('POST', myLambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
        {
          statusCode: '400',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
      ],
    });

    // Create Dynamodb table
    new Table(this, 'MyTable', {
      tableName: 'lambda-apigateway',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      deletionProtection: false,
    });
  }
}
