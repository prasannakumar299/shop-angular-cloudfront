import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProductServiceStack } from './product-service/product-service-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsUserProductStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const app = new cdk.App();
    new ProductServiceStack(app, 'ProductServiceStack', {
      env: { account: '901792596833', region: 'eu-north-1' },
    });
  }
}
