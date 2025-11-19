import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import csv from 'csv-parser';

const s3 = new S3Client();
const sqs = new SQSClient({ region: process.env.AWS_REGION });

export const handler = async (event: S3Event) => {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const objectKey = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, ' '),
    );

    console.log(
      `Processing file from bucket: ${bucketName}, key: ${objectKey}`,
    );

    try {
      const response = await s3.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        }),
      );
      const s3Stream = response.Body as NodeJS.ReadableStream;

      await new Promise<void>((resolve, reject) => {
        s3Stream
          .pipe(csv())
          .on('data', async (data) => {
            try {
              await sqs.send(
                new SendMessageCommand({
                  QueueUrl: process.env.SQS_URL!,
                  MessageBody: JSON.stringify(data),
                }),
              );
              console.log('📤 Sent record to SQS:', data);
            } catch (err) {
              console.error('❌ Failed to send record to SQS:', err);
            }
          })
          .on('end', () => {
            console.log('✅ CSV parsing completed.');
            resolve();
          })
          .on('error', (err) => {
            console.error('❌ Error parsing CSV:', err);
            reject(err);
          });
      });
    } catch (error) {
      console.error('❌ Failed to process file:', error);
      throw error;
    }
  }
};
