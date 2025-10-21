import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function to get the list of products
    const getProductsListLambda = new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'products-handler.getProductsList',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/products')),
    });

    // Lambda function to get product details by ID
    const getProductsByIdLambda = new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'products-handler.getProductsById',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/products')),
    });

    // API Gateway to expose the Lambda functions
    const api = new apigateway.RestApi(this, 'ProductApi', {
      restApiName: 'Product Service',
      description: 'This service serves product data.',
    });

    // Integration for getting the list of products
    const getProductsIntegration = new apigateway.LambdaIntegration(
      getProductsListLambda,
      {
        proxy: true,
      },
    );

    // Integration for getting product details by ID
    const getProductByIdIntegration = new apigateway.LambdaIntegration(
      getProductsByIdLambda,
      {
        proxy: true,
      },
    );

    // Define API resources and methods
    const products = api.root.addResource('products');
    products.addMethod('GET', getProductsIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });

    const singleProduct = products.addResource('{id}');
    singleProduct.addMethod('GET', getProductByIdIntegration, {
      methodResponses: [{ statusCode: '200' }, { statusCode: '404' }],
    });

    products.addCorsPreflight({
      allowOrigins: ['*'],
      allowMethods: ['GET'],
    });
    singleProduct.addCorsPreflight({
      allowOrigins: ['*'],
      allowMethods: ['GET'],
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url ?? 'Error: No URL found',
    });
  }
}
