# AI Patterns

## Overview

XCrapper uses multiple AI providers with automatic fallback:
1. **Groq** — Primary (free tier, fast)
2. **Google Gemini** — Secondary (generous free tier)
3. **OpenRouter** — Tertiary (multiple free models)

## Provider Configuration

### Environment Variables

```env
GROQ_API_KEY=your_groq_api_key
GOOGLE_AI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Available Models

```typescript
// Groq models
'llama-3.3-70b-versatile'    // Best quality, slower
'llama-3.1-8b-instant'       // Fast, good quality
'gemma2-9b-it'               // Google via Groq
'mixtral-8x7b-32768'         // Long context

// Gemini models
'gemini-2.0-flash-exp'       // Latest, experimental
'gemini-1.5-flash'           // Fast and efficient
'gemini-1.5-pro'             // Higher capacity

// OpenRouter models (free tier)
'google/gemma-2-9b-it:free'
'meta-llama/llama-3.2-3b-instruct:free'
'qwen/qwen-2-7b-instruct:free'
'microsoft/phi-3-mini-128k-instruct:free'
'mistralai/mistral-7b-instruct:free'
```

## AI Integration (`src/lib/ai.ts`)

### Main Function: `analyzeTweet`

```typescript
export async function analyzeTweet(
  tweet: string,
  prompt: string,
  model: AIModel
): Promise<{
  success: boolean;
  result?: AIAnalysisResult;
  error?: string;
  provider?: AIProvider;
}> {
  // Tries providers in order: groq → gemini → openrouter
  // Returns first successful result or final error
}
```

### AI Response Interface

```typescript
interface AIAnalysisResult {
  RELEVANCE: number;           // 1-10 score
  IS_PERSONAL: boolean;        // Author's own work?
  IS_QUOTABLE_PROJECT: boolean; // Worth quoting with credit?
  IS_BREAKING_NEWS: boolean;   // Breaking news detection
  AUTHOR_USERNAME: string | null;
  TRANSLATION: string | null;  // Original language translation
  PARAPHRASE: string | null;   // Rewritten tweet (200-280 chars)
  QUOTE: string | null;        // Quote format with @mention
  SUMMARY: string | null;      // One-line summary
}
```

### Provider-Specific Patterns

#### Groq

```typescript
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const completion = await groq.chat.completions.create({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ],
  model: 'llama-3.3-70b-versatile',
  temperature: 0.3,
  max_tokens: 1024,
});

const content = completion.choices[0]?.message?.content;
```

#### Google Gemini

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 1024,
  },
});

const content = result.response.text();
```

#### OpenRouter

```typescript
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://xcrapper.app',
    'X-Title': 'XCrapper',
  },
});

const completion = await openrouter.chat.completions.create({
  model: 'google/gemma-2-9b-it:free',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ],
  temperature: 0.3,
  max_tokens: 1024,
});
```

## System Prompt

The system prompt is stored in `AppConfig.aiSystemPrompt` and can be edited in the Config view.

### Default Prompt Location

`src/lib/db.ts` → `DEFAULT_CONFIG.aiSystemPrompt`

### Prompt Structure

```
1. Role definition (creator de contenido tech, español Latam)
2. Tweet to analyze placeholder: {tweet_content}
3. Relevance evaluation (TIER 1-4)
4. Breaking news detection
5. Classification (personal, quotable)
6. Content generation rules
7. Style guide (Latam Spanish)
8. JSON output format
```

### Placeholder Replacement

```typescript
// In scrape route
const prompt = config.aiSystemPrompt
  .replace('{tweet_content}', tweet.originalContent)
  .replace('{target_language}', config.targetLanguage);
```

## JSON Parsing

AI responses must be valid JSON. The parser handles:

```typescript
function parseAIResponse(content: string): AIAnalysisResult | null {
  // 1. Try direct JSON parse
  try {
    return JSON.parse(content);
  } catch {}

  // 2. Extract JSON from markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

  // 3. Find JSON object in text
  const objectMatch = content.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return JSON.parse(objectMatch[0]);
  }

  return null;
}
```

## Error Handling

### Provider Fallback

```typescript
const providers: AIProvider[] = ['groq', 'gemini', 'openrouter'];

for (const provider of providers) {
  try {
    const result = await callProvider(provider, prompt);
    if (result) {
      return { success: true, result, provider };
    }
  } catch (error) {
    console.error(`${provider} failed:`, error);
    // Continue to next provider
  }
}

return { success: false, error: 'All providers failed' };
```

### Rate Limiting

Groq has aggressive rate limits. Handle with retry:

```typescript
if (error.status === 429) {
  const retryAfter = error.headers?.['retry-after'] || 60;
  await sleep(retryAfter * 1000);
  // Retry or fallback to next provider
}
```

## Reprocessing Tweets

The reprocess API allows re-analyzing a tweet with updated prompt:

```typescript
// POST /api/reprocess
{
  tweetId: string;
  originalContent: string;
  prompt: string;
  model: AIModel;
}
```

## Best Practices

1. **Always validate JSON** — AI responses may include extra text
2. **Use fallback providers** — Don't rely on single provider
3. **Set temperature low (0.3)** — For consistent, factual output
4. **Limit tokens** — 1024 is usually enough for tweet analysis
5. **Log provider used** — Store `aiModel` with each tweet for debugging
6. **Handle timeouts** — Set reasonable timeout (30s default)
