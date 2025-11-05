import { S3Event } from 'aws-lambda';
import { S3, SQS } from 'aws-sdk';
import csv from 'csv-parser';

const s3 = new S3();
const sqs = new SQS();

const SQS_URL = process.env.SQS_URL!;

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
      const s3Stream = s3
        .getObject({ Bucket: bucketName, Key: objectKey })
        .createReadStream();

      await new Promise<void>((resolve, reject) => {
        s3Stream
          .pipe(csv())
          .on('data', async (data) => {
            try {
              await sqs
                .sendMessage({
                  QueueUrl: SQS_URL,
                  MessageBody: JSON.stringify(data),
                })
                .promise();
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
