import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for import service
    const importBucket = new s3.Bucket(this, 'ImportProductsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Create SQS queue for catalog items
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalog-items-queue',
    });

    const importProductsFile = new lambdaNodejs.NodejsFunction(
      this,
      'importProductsFile',
      {
        entry: path.join(__dirname, 'lambda/import-products-handler.ts'), // path to lambda source
        handler: 'handler',
        runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          REGION: this.region,
        },
        bundling: {
          minify: false,
        },
        memorySize: 256,
        timeout: cdk.Duration.seconds(10),
      },
    );

    // permit the lambda function to put objects into the bucket
    importBucket.grantPut(importProductsFile);
    // permit the lambda function to read from the bucket
    importBucket.grantRead(importProductsFile);

    // Lambda to parse the uploaded csv files
    const importFileParser = new lambdaNodejs.NodejsFunction(
      this,
      'importFileParser',
      {
        entry: path.join(__dirname, 'lambda/import-file-parser.ts'),
        handler: 'handler',
        runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          SQS_URL: catalogItemsQueue.queueUrl,
        },
      },
    );

    importBucket.grantRead(importFileParser);
    catalogItemsQueue.grantSendMessages(importFileParser);

    // Configure S3 event trigger for 'uploaded/' folder
    importFileParser.addEventSource(
      new lambdaEventSources.S3EventSource(importBucket, {
        events: [s3.EventType.OBJECT_CREATED],
        filters: [{ prefix: 'uploaded/' }],
      }),
    );

    const api = new apigw.RestApi(this, 'ImportApi', {
      restApiName: 'Import Service API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    const immportProducts = api.root.addResource('import');
    immportProducts.addMethod(
      'GET',
      new apigw.LambdaIntegration(importProductsFile),
    );

    new s3deploy.BucketDeployment(this, 'CreateUploadedFolder', {
      destinationBucket: importBucket,
      sources: [s3deploy.Source.asset('assets/uploaded')], // empty file
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: importBucket.bucketName,
      description: 'Import Service S3 Bucket Name',
    });
  }
}
