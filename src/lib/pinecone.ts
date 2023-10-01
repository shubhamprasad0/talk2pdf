import { Pinecone } from "@pinecone-database/pinecone";
import md5 from "md5";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

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

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: {
      pageNumber: number;
    };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  // 1. Obtain the pdf -> download and read from pdf
  console.log("downloading pdf from s3 to file system...");
  const fileName = await downloadFromS3(fileKey);
  if (!fileName) {
    throw new Error("error downloading pdf from s3");
  }
  const loader = new PDFLoader(fileName);
  const pages = (await loader.load()) as PDFPage[];

  // 2. Split and segment the pdf
  const documents = await Promise.all(pages.map(prepareDocument));

  // 3. Create batches of documents
  const batches = createDocumentBatches(documents.flat(), 1000);
  console.log(`created ${batches.length} batches of documents`);

  // 4. Vectorize and embed individual documents
  const vectors = (await Promise.all(batches.map(embedDocuments))).flat();

  // 4. Upload vectors to pinecone db
  const pinecone = await getPinecone();
  const namespace = convertToAscii(fileKey);

  const pineconeIndex = await pinecone
    .index(process.env.PINECONE_INDEX_NAME!)
    .namespace(namespace);

  console.log("inserting vectors into pinecone db...");
  await pineconeIndex.upsert(vectors);
}

function createDocumentBatches(
  documents: Document[],
  batchSize: number
): Document[][] {
  const batches: Document[][] = [];
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    batches.push(batch);
  }
  return batches;
}

async function embedDocuments(docs: Document[]) {
  try {
    const pageContents = docs.map((d) => d.pageContent);
    const embeddings = await getEmbeddings(pageContents);
    const hashes = docs.map((d) => md5(d.pageContent));

    return hashes.map((hash, index) => {
      return {
        id: hash,
        values: embeddings[index],
        metadata: {
          text: docs[index].metadata.text as string,
          pageNumber: docs[index].metadata.pageNumber as number,
        },
      };
    });
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

export async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");

  // split the docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
