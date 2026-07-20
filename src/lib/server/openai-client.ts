import OpenAI from "openai";

export class ModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelOutputError";
  }
}

type ParsedResponseShape = {
  status?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      refusal?: string;
      parsed?: unknown;
    }>;
  }>;
};

let openAIClient: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI is not configured.");
  }

  openAIClient ??= new OpenAI({ apiKey });
  return openAIClient;
}

export function extractParsedOutput<T>(response: ParsedResponseShape): T {
  if (response.status !== "completed") {
    throw new ModelOutputError("The model response was incomplete.");
  }

  for (const output of response.output ?? []) {
    if (output.type !== "message") continue;

    for (const item of output.content ?? []) {
      if (item.type === "refusal") {
        throw new ModelOutputError("The model declined this analysis.");
      }
      if (item.type === "output_text" && item.parsed != null) {
        return item.parsed as T;
      }
    }
  }

  throw new ModelOutputError("The model did not return valid structured output.");
}
