import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { Paper } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Translate papers to Spanish using Groq with error handling
async function translateToSpanish(texts: { title: string; abstract: string }[]): Promise<{ titleEs: string; abstractEs: string; hook: string }[]> {
  const apiKey = process.env.GROQ_API_KEY;

  // If no API key, return originals with simple hooks
  if (!apiKey) {
    console.log('[Papers] No GROQ_API_KEY, skipping translation');
    return texts.map(t => ({ 
      titleEs: t.title, 
      abstractEs: t.abstract,
      hook: t.title // Fallback hook is just the title
    }));
  }

  try {
    const groq = new Groq({ apiKey });

    // Batch translate all papers in one request
    const prompt = `Analiza los siguientes títulos y abstracts de papers científicos.
Tu tarea es generar 3 campos para cada paper en español latinoamericano:

1. "titleEs": Título técnico traducido fielmente.
2. "abstractEs": Abstract traducido manteniendo el rigor técnico.
3. "hook": UN SOLO PÁRRAFO CORTO (1-2 oraciones) que explique qué hace el paper en lenguaje sencillo y atractivo, evitando jerga técnica compleja. Estilo "Noticia de tecnología". 
   - Malo: "Proponemos una arquitectura transformer con atención dispersa..."
   - Bueno: "Esta nueva IA reduce el costo de procesar videos largos ignorando la información repetitiva, haciéndolo 10 veces más rápido."

Responde SOLO con un JSON array, sin markdown ni explicaciones.

Textos a procesar:
${JSON.stringify(texts, null, 2)}

Responde con este formato exacto (JSON array):
[
  {
    "titleEs": "título traducido...",
    "abstractEs": "abstract traducido...",
    "hook": "gancho sencillo..."
  }
]`;

    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8000,
    });

    const responseText = result.choices[0]?.message?.content || '';

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    if (responseText.includes('```')) {
      const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1];
    }

    const translations = JSON.parse(jsonStr.trim());
    console.log('[Papers] Translation successful');
    return translations;
  } catch (error) {
    console.error('[Papers] Translation error:', error);
    // Gracefully fall back to original text
    return texts.map(t => ({ 
      titleEs: t.title, 
      abstractEs: t.abstract,
      hook: t.title
    }));
  }
}

interface HFPaperResponse {
  paper: {
    id: string;
    title: string;
    summary: string;
    authors: { name: string }[];
    publishedAt: string;
    upvotes: number;
    organization?: {
      fullname: string;
    };
  };
  title: string;
  summary: string;
  thumbnail?: string;
  numComments: number;
  organization?: {
    fullname: string;
  };
}

// Fetch papers from Hugging Face API
async function fetchHuggingFacePapers(date?: string): Promise<Paper[]> {
  // HF API endpoint - returns today's papers by default
  const url = date
    ? `https://huggingface.co/api/daily_papers?date=${date}`
    : 'https://huggingface.co/api/daily_papers';

  console.log('[Papers] Fetching from HF API:', url);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'XCrapper/1.0',
      'Accept': 'application/json',
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HF papers: ${response.status}`);
  }

  const data: HFPaperResponse[] = await response.json();
  console.log('[Papers] Received papers:', data.length);

  // Prepare data for translation
  const textsToTranslate = data.slice(0, 15).map(item => ({
    title: item.title || item.paper.title,
    abstract: item.summary || item.paper.summary || '',
  }));

  // Translate all at once
  console.log('[Papers] Translating', textsToTranslate.length, 'papers to Spanish...');
  const translations = await translateToSpanish(textsToTranslate);

  const papers: Paper[] = data.slice(0, 15).map((item, index) => ({
    id: `paper-${item.paper.id}`,
    title: item.title || item.paper.title,
    titleEs: translations[index]?.titleEs || item.title || item.paper.title,
    hook: translations[index]?.hook || item.title || item.paper.title,
    abstract: item.summary || item.paper.summary || '',
    abstractEs: translations[index]?.abstractEs || item.summary || item.paper.summary || '',
    authors: item.paper.authors?.map(a => a.name) || [],
    institution: item.organization?.fullname || item.paper.organization?.fullname,
    arxivId: item.paper.id,
    upvotes: item.paper.upvotes || 0, // upvotes are inside paper object
    thumbnail: item.thumbnail,
    publishedAt: new Date(item.paper.publishedAt),
    fetchedAt: new Date(),
    url: `https://huggingface.co/papers/${item.paper.id}`,
  }));

  // Sort by upvotes (should already be sorted but just in case)
  papers.sort((a, b) => b.upvotes - a.upvotes);

  console.log('[Papers] Done! Returning', papers.length, 'translated papers');
  return papers;
}

// Helper to subtract days from a YYYY-MM-DD string
function subtractDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  try {
    let papers = await fetchHuggingFacePapers(dateParam || undefined);
    let finalDate = dateParam || new Date().toISOString().split('T')[0];
    const requestedDate = finalDate;

    // Auto-fallback: If date was requested but returns 0 papers, try previous days
    if (papers.length === 0 && dateParam) {
      console.log(`[Papers] No papers found for ${requestedDate}, trying previous dates...`);
      let attempts = 0;
      let currentDate = finalDate;

      while (papers.length === 0 && attempts < 5) {
        attempts++;
        currentDate = subtractDays(currentDate, 1);
        console.log(`[Papers] Fallback attempt ${attempts}: fetching for ${currentDate}`);
        
        try {
          papers = await fetchHuggingFacePapers(currentDate);
          if (papers.length > 0) {
            finalDate = currentDate;
            console.log(`[Papers] Found ${papers.length} papers on ${finalDate}`);
            break;
          }
        } catch (err) {
          console.warn(`[Papers] Failed to fetch for fallback date ${currentDate}`, err);
        }
      }
    }

    return NextResponse.json({
      papers,
      date: finalDate,
      requestedDate,
      count: papers.length,
      source: 'huggingface'
    });
  } catch (error) {
    console.error('[Papers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch papers', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
