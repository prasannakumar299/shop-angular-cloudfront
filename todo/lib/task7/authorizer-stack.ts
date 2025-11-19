import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class AuthorizerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambda.Function(this, 'lambda-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'handler.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
    });

    // Create a Cognito User Pool
    const userPool = new cognito.UserPool(this, 'my-user-pool', {
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        familyName: {
          mutable: true,
          required: true,
        },
        phoneNumber: { required: false },
      },
      customAttributes: {
        createdAt: new cognito.DateTimeAttribute(),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create a User Pool Client for the application to interact with the User Pool.
    userPool.addClient('my-app-client', {
      userPoolClientName: 'my-app-client',
      authFlows: {
        userPassword: true,
      },
    });

    // Add a domain to the User Pool for hosted UI authentication flows.
    userPool.addDomain('Domain', {
      cognitoDomain: {
        domainPrefix: 'authorization',
      },
    });

    const api = new apigateway.RestApi(this, 'my-api', {
      restApiName: 'My API Gateway',
      description: 'This API serves the Lambda functions.',
    });

    // Create a Cognito User Pools Authorizer for API Gateway to use Cognito User Pool for authorization.
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'my-authorizer',
      {
        authorizerName: 'my-authorizer',
        cognitoUserPools: [userPool],
      },
    );

    // Integrate Lambda function with API Gateway using the Cognito Authorizer.
    const helloFromLambdaIntegration = new apigateway.LambdaIntegration(
      lambdaFunction,
      {
        requestTemplates: {
          'application/json': `{ "message": "$input.params('message')" }`,
        },
        integrationResponses: [
          {
            statusCode: '200',
          },
        ],
        proxy: false,
      },
    );

    const helloResource = api.root.addResource('hello');
    helloResource.addMethod('GET', helloFromLambdaIntegration, {
      methodResponses: [{ statusCode: '200' }],
      authorizer,
    });
  }
}
