import { OpenAIApi, Configuration } from "openai-edge";
import { sleep } from "./utils";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const config = new Configuration({
  apiKey: OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(texts: string[]) {
  const processedTexts = texts.map((text) => text.replace(/\n/g, " "));
  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: processedTexts,
    });
    const result = await response.json();
    if (result.data) {
      return result.data.map((item: any) => item.embedding as number[]);
    }
    return [[]];
  } catch (error) {
    console.log("error calling openai embeddings api", error);
    throw error;
  }
}
