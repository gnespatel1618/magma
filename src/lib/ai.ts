export type AIConfig = {
  apiKey?: string;
  baseUrl?: string;
};

export type AIRequest = {
  prompt: string;
  maxTokens?: number;
};

// Stubbed LLM caller; wire to OpenAI/compatible endpoint later.
export async function callAI(_config: AIConfig, _req: AIRequest) {
  return {
    summary: 'This is a stubbed AI response.',
    actions: ['Wire to OpenAI with embeddings', 'Cache responses locally']
  };
}

