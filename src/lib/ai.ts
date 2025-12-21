/**
 * Configuration for AI/LLM API connections.
 */
export type AIConfig = {
  /** API key for authentication */
  apiKey?: string;
  /** Base URL for the API endpoint */
  baseUrl?: string;
};

/**
 * Request payload for AI operations.
 */
export type AIRequest = {
  /** The prompt or input text to send to the AI */
  prompt: string;
  /** Maximum number of tokens to generate (optional) */
  maxTokens?: number;
};

/**
 * Response from AI operations.
 */
export type AIResponse = {
  /** Generated summary or response text */
  summary: string;
  /** Suggested actions or follow-ups */
  actions: string[];
};

/**
 * Calls an AI/LLM service with the provided configuration and request.
 * 
 * This is currently a stub implementation that returns placeholder data.
 * In a full implementation, this would:
 * - Make HTTP requests to OpenAI or compatible endpoints
 * - Handle authentication with API keys
 * - Process and return the AI-generated response
 * - Cache responses locally for performance
 * 
 * @param _config - AI configuration (apiKey, baseUrl)
 * @param _req - AI request (prompt, maxTokens)
 * @returns Promise resolving to an AI response with summary and actions
 * 
 * @example
 * ```typescript
 * const response = await callAI(
 *   { apiKey: 'sk-...', baseUrl: 'https://api.openai.com' },
 *   { prompt: 'Summarize this note', maxTokens: 200 }
 * );
 * ```
 */
export async function callAI(_config: AIConfig, _req: AIRequest): Promise<AIResponse> {
  return {
    summary: 'This is a stubbed AI response.',
    actions: ['Wire to OpenAI with embeddings', 'Cache responses locally'],
  };
}

