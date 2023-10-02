import { Pinecone } from "@pinecone-database/pinecone";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

export async function getMatchesFromEmbeddings(
  embeddings: number[],
  fileKey: string
) {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
    environment: process.env.PINECONE_ENVIRONMENT!,
  });
  const namespace = convertToAscii(fileKey);

  const pineconeIndex = await pinecone
    .index(process.env.PINECONE_INDEX_NAME!)
    .namespace(namespace);

  try {
    const queryResult = await pineconeIndex.query({
      vector: embeddings,
      topK: 5,
      includeMetadata: true,
    });
    return queryResult.matches || [];
  } catch (error) {
    console.log("error getting matches from embeddings", error);
    throw error;
  }
}

export async function getContext(query: string, fileKey: string) {
  const queryEmbeddings = await getEmbeddings([query]);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings[0], fileKey);

  const qualifyingMatches = matches.filter(
    (match) => match.score && match.score > 0.7
  );

  type Metadata = {
    text: string;
    pageNumber: number;
  };

  let docs = qualifyingMatches.map(
    (match) => (match.metadata as Metadata).text
  );
  return docs.join("\n").substring(0, 3000);
}
