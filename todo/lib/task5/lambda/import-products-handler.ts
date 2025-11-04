// lambda/import-products-file.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const REGION = process.env.REGION || 'us-east-1';

const s3 = new S3Client({ region: REGION });

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  // API Gateway mapping puts query params in event.queryStringParameters
  const fileName = event?.queryStringParameters?.name;
  if (!fileName) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: "Missing 'name' query parameter" }),
    };
  }

  const objectKey = `uploaded/${fileName}`;

  try {
    const cmd = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: objectKey,
      ContentType: 'text/csv',
    });

    // expiry seconds
    const expiresIn = 300; // 5 minutes
    const signedUrl = await getSignedUrl(s3, cmd, { expiresIn });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: signedUrl, key: objectKey, expiresIn }),
    };
  } catch (err) {
    console.error('Failed to create signed url', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
