import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

dotenv.config(); // Load .env file

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new lambdaNodejs.NodejsFunction(this, 'basicAuthorizer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'basicAuthorizer.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      environment: {
        GITHUB_USER: process.env.GITHUB_USER!,
        GITHUB_PASSWORD: process.env.GITHUB_PASSWORD!,
      },
    });
  }
}
