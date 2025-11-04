import { S3Event } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import csv from 'csv-parser';

const s3 = new S3();

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
          .on('data', (data) => {
            console.log('Parsed record:', data); //  each row logged to CloudWatch
          })
          .on('end', () => {
            console.log('✅ CSV parsing completed.');
            resolve();
          })
          .on('error', (err) => {
            console.error(' Error parsing CSV:', err);
            reject(err);
          });
      });
    } catch (error) {
      console.error(' Failed to process file:', error);
      throw error;
    }
  }
};
