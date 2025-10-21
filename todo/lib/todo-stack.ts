import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

const TableName = 'Todos';
export class TodoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB table to store todo items
    const todosTable = new dynamodb.Table(this, 'Todos', {
      tableName: 'Todos',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    // Lambda function to add a todo item
    const addTodoLambda = new lambdaNodejs.NodejsFunction(
      this,
      'lambda-function',
      {
        entry: join(__dirname, 'lambda-handler.ts'), // your actual handler file
        handler: 'addTodo', // function export name
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        environment: {
          TABLE_NAME: TableName,
        },
        bundling: {
          minify: true,
          externalModules: ['aws-sdk'], // leave empty so uuid is bundled
        },
      },
    );

    todosTable.grantWriteData(addTodoLambda);
  }
}
