// Filename: Todo/handler.ts
import { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent } from 'aws-lambda';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.TABLE_NAME as string;

export const addTodo: Handler = async (event: APIGatewayProxyEvent) => {
  const body =
    typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

  const { name, place } = body;

  try {
    const command = new PutItemCommand({
      TableName: tableName,
      Item: {
        id: { S: uuidv4() },
        createdAt: { N: Date.now().toString() },
        name: { S: name }, // body structure: { name: string, place: string }
        place: { S: place },
      },
    });
    const result = await dynamoDB.send(command);
    console.log('PutItem succeeded:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Error adding item to DynamoDB table');
  }
};
