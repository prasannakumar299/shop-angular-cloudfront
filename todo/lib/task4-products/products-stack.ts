import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
export class ProductsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new lambdaNodejs.NodejsFunction(this, 'products-update-lambda-function', {
      entry: join(__dirname, '../task4-products/products-handler.ts'), // your actual handler file
      handler: 'fillTables', // function export name
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
    });

    // Lambda for GET /products
    const getProductsListLambda = new lambdaNodejs.NodejsFunction(
      this,
      'getProductsListLambda',
      {
        entry: join(__dirname, '../task4-products/products-handler.ts'),
        handler: 'getProductsList',
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          PRODUCTS_TABLE: 'products',
          STOCK_TABLE: 'stock',
          REGION: this.region,
        },
      },
    );

    //  Lambda for GET /products/{productId}
    const getProductByIdLambda = new lambdaNodejs.NodejsFunction(
      this,
      'getProductByIdLambda',
      {
        entry: join(__dirname, '../task4-products/products-handler.ts'),
        handler: 'getProductById',
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          PRODUCTS_TABLE: 'products',
          STOCK_TABLE: 'stock',
          REGION: this.region,
        },
      },
    );

    // Lambda for POST /products
    const createProductLambda = new lambdaNodejs.NodejsFunction(
      this,
      'createProductLambda',
      {
        entry: join(__dirname, '../task4-products/products-handler.ts'),
        handler: 'createProduct',
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          PRODUCTS_TABLE: 'products',
          STOCK_TABLE: 'stock',
          REGION: this.region,
        },
      },
    );

    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Products Service',
    });

    const products = api.root.addResource('products');
    products.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsListLambda),
    );
    products.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createProductLambda),
    );

    const productById = products.addResource('{productId}');
    productById.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductByIdLambda),
    );

    // SQS Queue for catalog items
    const catalogItemsQueue = new sqs.Queue(this, 'catalogItemsQueue');

    // SNS Topic for product creation notifications
    const createProductTopic = new sns.Topic(this, 'createProductTopic', {
      displayName: 'Product Creation Notifications',
    });

    createProductTopic.addSubscription(
      new subs.EmailSubscription('prasannakumar2899@gmail.com'),
    );

    // Lambda to process SQS messages
    const catalogBatchProcess = new lambdaNodejs.NodejsFunction(
      this,
      'catalogBatchProcess',
      {
        entry: join(__dirname, '../task4-products/products-handler.ts'),
        handler: 'catalogBatchProcess',
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          PRODUCTS_TABLE: 'products',
          CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
        },
        bundling: {
          externalModules: [], // include everything
        },
      },
    );

    // Allow the Lambda to publish to SNS topic
    createProductTopic.grantPublish(catalogBatchProcess);

    // lambda function invoked by SQS events
    catalogBatchProcess.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      }),
    );
  }
}
