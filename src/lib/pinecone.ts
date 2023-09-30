import { Pinecone } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";

let pinecone: Pinecone | null = null;

export const getPinecone = async () => {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!,
    });
  }
  return pinecone;
};

export async function loadS3IntoPinecone(fileKey: string) {
  // 1. Obtain the pdf -> download and read from pdf
  console.log("downloading pdf from s3 to file system...");
  const fileName = await downloadFromS3(fileKey);
  if (!fileName) {
    throw new Error("error downloading pdf from s3");
  }
  const loader = new PDFLoader(fileName);
  const pages = await loader.load();
  return pages;
}
