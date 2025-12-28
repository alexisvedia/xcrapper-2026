import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant', 
  'gemma2-9b-it'
];

async function callWithFallback(prompt: string, maxTokens: number = 2048, temperature: number = 0.7): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  let lastError;

  // Try Groq models first
  if (groqApiKey) {
    const groq = new Groq({ apiKey: groqApiKey });
    
    for (const model of GROQ_MODELS) {
      try {
        console.log(`[AI] Trying Groq model: ${model}`);
        const result = await groq.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: temperature,
          max_tokens: maxTokens,
        });
        
        const content = result.choices[0]?.message?.content;
        if (content) return content;
      } catch (e) {
        console.warn(`[AI] Groq model ${model} failed:`, e instanceof Error ? e.message : String(e));
        lastError = e;
      }
    }
  } else {
    console.log('[AI] No GROQ_API_KEY, skipping Groq models');
  }

  // Fallback to OpenRouter
  if (openRouterApiKey) {
    try {
      console.log('[AI] All Groq models failed or key missing. Trying OpenRouter (google/gemini-2.0-flash-001)...');
      const openai = new OpenAI({
        apiKey: openRouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1'
      });

      const result = await openai.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        max_tokens: maxTokens,
      });

      const content = result.choices[0]?.message?.content;
      if (content) return content;
    } catch (e) {
      console.error('[AI] OpenRouter fallback failed:', e instanceof Error ? e.message : String(e));
      lastError = e;
    }
  } else {
    console.log('[AI] No OPENROUTER_API_KEY, skipping OpenRouter fallback');
  }

  throw lastError || new Error('No AI models available or all failed');
}

// Generate a divulgación article from paper content
async function generateArticle(paper: {
  title: string;
  titleEs: string;
  abstract: string;
  abstractEs: string;
  authors: string[];
  arxivId?: string;
}): Promise<string> {
  const hasKeys = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!hasKeys) {
    throw new Error('GROQ_API_KEY and OPENROUTER_API_KEY not configured');
  }

  const prompt = `Eres un periodista científico experto en IA y tecnología. Tu trabajo es escribir artículos de divulgación científica que hagan accesible la investigación de vanguardia al público general hispanohablante.

PAPER:
Título: ${paper.titleEs || paper.title}
Título original: ${paper.title}
Autores: ${paper.authors.join(', ')}
ArXiv ID: ${paper.arxivId || 'N/A'}

Abstract:
${paper.abstractEs || paper.abstract}

---

Escribe un artículo de divulgación científica en español latinoamericano que:

1. **Enganche al lector** con un hook inicial que explique por qué esto importa
2. **Explique el problema** que resuelve esta investigación de forma simple
3. **Describa la solución** sin jerga técnica excesiva
4. **Destaque el impacto** - qué significa esto para el futuro de la IA/tecnología
5. **Incluya contexto** - cómo se relaciona con desarrollos anteriores

FORMATO:
- Usa párrafos cortos y claros
- Incluye analogías para conceptos complejos
- Evita abreviaciones sin explicar
- Escribe para alguien curioso pero no técnico
- Longitud: 3-5 párrafos (máximo 500 palabras)
- NO uses markdown headers (#), solo texto plano con párrafos

Escribe el artículo ahora:`;

  const article = await callWithFallback(prompt, 2048, 0.7);

  return article;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paper } = body;

    if (!paper) {
      return NextResponse.json(
        { error: 'Paper data is required' },
        { status: 400 }
      );
    }

    console.log('[Article] Generating article for:', paper.title?.slice(0, 50));

    const article = await generateArticle(paper);

    console.log('[Article] Generated article:', article.slice(0, 100) + '...');

    return NextResponse.json({
      article,
      paperId: paper.id,
    });
  } catch (error) {
    console.error('[Article] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate article', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
