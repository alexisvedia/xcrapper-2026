import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { AIModel, AI_MODELS, AIProvider } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Rate limit tracking per provider
const rateLimitState: Record<string, { blockedUntil: Date | null; retryAfterSeconds: number }> = {
  groq: { blockedUntil: null, retryAfterSeconds: 0 },
  gemini: { blockedUntil: null, retryAfterSeconds: 0 },
  openrouter: { blockedUntil: null, retryAfterSeconds: 0 },
};

// Fallback order when rate limited
const FALLBACK_MODELS: AIModel[] = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'google/gemma-2-9b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'llama-3.1-8b-instant',
];

function getProvider(model: AIModel): AIProvider {
  const modelInfo = AI_MODELS.find(m => m.id === model);
  return modelInfo?.provider || 'groq';
}

function isProviderAvailable(provider: AIProvider): boolean {
  const state = rateLimitState[provider];
  if (!state.blockedUntil) return true;
  return new Date() > state.blockedUntil;
}

function markProviderRateLimited(provider: AIProvider, retryAfterSeconds: number) {
  const blockedUntil = new Date(Date.now() + retryAfterSeconds * 1000);
  rateLimitState[provider] = { blockedUntil, retryAfterSeconds };
  console.log(`[AI] ${provider} rate limited, retry after ${retryAfterSeconds}s (until ${blockedUntil.toISOString()})`);
}

function parseRetryAfter(errorMessage: string): number {
  // Parse "Please try again in 9m52.704s" or similar
  const match = errorMessage.match(/try again in (\d+)m?([\d.]+)?s?/i);
  if (match) {
    const minutes = parseInt(match[1]) || 0;
    const seconds = parseFloat(match[2]) || 0;
    return minutes * 60 + seconds;
  }
  // Default to 10 minutes if can't parse
  return 600;
}

function getAvailableFallbackModel(primaryModel: AIModel): AIModel | null {
  const primaryProvider = getProvider(primaryModel);

  // If primary provider is available, use it
  if (isProviderAvailable(primaryProvider)) {
    return primaryModel;
  }

  // Try fallback models
  for (const fallbackModel of FALLBACK_MODELS) {
    const fallbackProvider = getProvider(fallbackModel);
    if (isProviderAvailable(fallbackProvider)) {
      console.log(`[AI] Using fallback model: ${fallbackModel} (${fallbackProvider})`);
      return fallbackModel;
    }
  }

  return null;
}

export function getRateLimitStatus(): { provider: string; blockedUntil: Date | null; retryAfterSeconds: number }[] {
  return Object.entries(rateLimitState).map(([provider, state]) => ({
    provider,
    blockedUntil: state.blockedUntil,
    retryAfterSeconds: state.retryAfterSeconds,
  }));
}

export interface AIAnalysisResult {
  relevance: number;
  isPersonal: boolean;
  isCiteable: boolean;
  isBreakingNews: boolean;
  authorUsername: string | null;
  translation: string | null;
  paraphrase: string | null;
  citation: string | null;
  summary: string | null;
  shouldReject: boolean;
  rejectionReason: string | null;
  model: string;
}

// Helper function to call AI with a specific model
async function callAIModel(
  model: AIModel,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const provider = getProvider(model);

  if (provider === 'gemini') {
    const geminiModel = gemini.getGenerativeModel({
      model,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    const result = await geminiModel.generateContent([
      { text: systemPrompt + '\n\n' + userPrompt }
    ]);

    return result.response.text() || '{}';
  } else if (provider === 'openrouter') {
    const completion = await openrouter.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.2,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || '{}';
  } else {
    // Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    return completion.choices[0]?.message?.content || '{}';
  }
}

export async function analyzeTweet(
  tweetContent: string,
  config: {
    targetLanguage: string;
    minRelevanceScore: number;
    rejectedPatterns: string[];
    aiSystemPrompt: string;
    aiModel: AIModel;
  }
): Promise<AIAnalysisResult> {
  const primaryModel = config.aiModel || 'llama-3.3-70b-versatile';

  // Check for rejected patterns first (if any configured)
  if (config.rejectedPatterns && config.rejectedPatterns.length > 0) {
    const lowerContent = tweetContent.toLowerCase();
    for (const pattern of config.rejectedPatterns) {
      if (pattern && lowerContent.includes(pattern.toLowerCase())) {
        return {
          relevance: 0,
          isPersonal: true,
          isCiteable: false,
          isBreakingNews: false,
          authorUsername: null,
          translation: null,
          paraphrase: null,
          citation: null,
          summary: null,
          shouldReject: true,
          rejectionReason: `Contiene patrón rechazado: "${pattern}"`,
          model: primaryModel,
        };
      }
    }
  }

  // Build the prompt with character limit
  const prompt = config.aiSystemPrompt
    .replace('{tweet_content}', tweetContent)
    .replace('{idioma_config}', config.targetLanguage)
    .replace('{target_language}', config.targetLanguage)
    .replace(/\{target_language\}/g, config.targetLanguage)
    .replace('{max_chars}', '280');

  // Get language name for clearer instructions
  const languageName = config.targetLanguage === 'es' ? 'Spanish' :
                       config.targetLanguage === 'en' ? 'English' :
                       config.targetLanguage === 'pt' ? 'Portuguese' : config.targetLanguage;

  // Minimal system prompt - main instructions come from config.aiSystemPrompt (visible in UI)
  const systemPrompt = `You are a senior AI/tech news editor. Follow the user's instructions exactly.
OUTPUT LANGUAGE: Write ALL outputs (PARAPHRASE, QUOTE, TRANSLATION, SUMMARY) in ${languageName}.
RESPOND ONLY with valid JSON. No markdown, no explanations.`;

  // Try models with fallback
  const modelsToTry: AIModel[] = [primaryModel, ...FALLBACK_MODELS.filter(m => m !== primaryModel)];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const provider = getProvider(model);

    // Skip if provider is rate limited
    if (!isProviderAvailable(provider)) {
      console.log(`[AI] Skipping ${model} (${provider}) - rate limited`);
      continue;
    }

    try {
      console.log(`[AI] Trying model: ${model} (${provider})`);
      const responseText = await callAIModel(model, systemPrompt, prompt);

      // Parse response - supports both English and Spanish field names
      let parsed: {
        // English fields
        RELEVANCE?: number;
        IS_PERSONAL?: boolean;
        IS_QUOTABLE_PROJECT?: boolean;
        IS_BREAKING_NEWS?: boolean;
        AUTHOR_USERNAME?: string;
        TRANSLATION?: string;
        PARAPHRASE?: string;
        QUOTE?: string;
        SUMMARY?: string;
        // Spanish fields (legacy)
        RELEVANCIA?: number;
        ES_PERSONAL?: boolean;
        ES_PROYECTO_CITEABLE?: boolean;
        ES_BREAKING_NEWS?: boolean;
        AUTOR_USERNAME?: string;
        TRADUCCION?: string;
        PARAFRASIS?: string;
        CITA?: string;
        RESUMEN?: string;
      };

      try {
        parsed = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse AI response:', responseText);
        return {
          relevance: 5,
          isPersonal: false,
          isCiteable: false,
          isBreakingNews: false,
          authorUsername: null,
          translation: null,
          paraphrase: null,
          citation: null,
          summary: null,
          shouldReject: false,
          rejectionReason: null,
          model,
        };
      }

      // Support both English and Spanish field names
      const relevance = parsed.RELEVANCE ?? parsed.RELEVANCIA ?? 5;
      const isPersonal = parsed.IS_PERSONAL ?? parsed.ES_PERSONAL ?? false;
      const isCiteable = parsed.IS_QUOTABLE_PROJECT ?? parsed.ES_PROYECTO_CITEABLE ?? false;
      const isBreakingNews = parsed.IS_BREAKING_NEWS ?? parsed.ES_BREAKING_NEWS ?? false;
      const authorUsername = parsed.AUTHOR_USERNAME ?? parsed.AUTOR_USERNAME ?? null;
      const translation = parsed.TRANSLATION ?? parsed.TRADUCCION ?? null;
      const paraphraseText = parsed.PARAPHRASE ?? parsed.PARAFRASIS ?? null;
      const quoteText = parsed.QUOTE ?? parsed.CITA ?? null;
      const summaryText = parsed.SUMMARY ?? parsed.RESUMEN ?? null;

      // Determine if should reject
      const shouldReject = relevance < config.minRelevanceScore || (isPersonal && !isCiteable);

      // Use citation if it's a citeable personal project, otherwise use paraphrase
      const finalParaphrase = isCiteable && quoteText ? quoteText : paraphraseText;

      // Success! Return result
      return {
        relevance,
        isPersonal,
        isCiteable,
        isBreakingNews,
        authorUsername,
        translation,
        paraphrase: finalParaphrase,
        citation: quoteText,
        summary: summaryText,
        shouldReject,
        rejectionReason: shouldReject
          ? relevance < config.minRelevanceScore
            ? `Insufficient relevance: ${relevance}/${config.minRelevanceScore}`
            : 'Personal content without quotable value'
          : null,
        model,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;

      // Check if it's a rate limit error (429)
      if (errorMessage.includes('429') || errorMessage.includes('rate_limit') || errorMessage.includes('Rate limit')) {
        const retryAfter = parseRetryAfter(errorMessage);
        markProviderRateLimited(provider, retryAfter);
        console.log(`[AI] Rate limited on ${model}, trying fallback...`);
        continue; // Try next model
      }

      // For other errors, log and try next model
      console.error(`[AI] Error with ${model}:`, errorMessage);
      continue;
    }
  }

  // All models failed
  throw lastError || new Error('All AI models failed');
}

// Reprocess a tweet with custom instructions
export async function reprocessTweet(
  originalContent: string,
  instruction: string,
  targetLanguage: string
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Eres un asistente experto en reescribir contenido. Responde solo con el texto reescrito, sin explicaciones.`,
        },
        {
          role: 'user',
          content: `Contenido original: "${originalContent}"

Instrucción: ${instruction}

Idioma de salida: ${targetLanguage}

IMPORTANTE: El resultado debe tener MÁXIMO 280 caracteres (límite de Twitter).

Reescribe el contenido siguiendo la instrucción. Solo devuelve el texto final.`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 512,
    });

    return completion.choices[0]?.message?.content || originalContent;
  } catch (error) {
    console.error('Error reprocessing tweet:', error);
    throw error;
  }
}

// ========== SIMILARITY CHECK ==========

// Normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/[^\w\sáéíóúñü]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Extract key terms from text
function extractKeyTerms(text: string): Set<string> {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(w => w.length > 3);
  return new Set(words);
}

// Calculate Jaccard similarity between two sets
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Check if content is similar to any existing content
export function checkSimilarity(newContent: string, existingContents: string[], threshold: number = 0.5): boolean {
  const newTerms = extractKeyTerms(newContent);

  // If too few terms, can't reliably compare
  if (newTerms.size < 3) return false;

  for (const existing of existingContents) {
    const existingTerms = extractKeyTerms(existing);
    const similarity = jaccardSimilarity(newTerms, existingTerms);

    if (similarity >= threshold) {
      console.log(`[Similarity] Found similar content (${(similarity * 100).toFixed(1)}%): "${newContent.slice(0, 50)}..." matches "${existing.slice(0, 50)}..."`);
      return true;
    }
  }

  return false;
}
