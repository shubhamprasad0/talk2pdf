import AWS from "aws-sdk";
import fs from "fs";

export async function downloadFromS3(fileKey: string) {
  try {
    AWS.config.update({
      accessKeyId: process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY,
    });
    const s3 = new AWS.S3({
      params: {
        Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
      },
      region: "ap-south-1",
    });

    const params = {
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME!,
      Key: fileKey,
    };

    const obj = await s3.getObject(params).promise();
    const fileName = `/tmp/pdf-${Date.now()}.pdf`;
    fs.writeFileSync(fileName, obj.Body as Buffer);
    return fileName;
  } catch (error) {
    console.error(error);
    return null;
  }
}
