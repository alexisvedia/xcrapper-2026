import { NextResponse } from 'next/server';
import { Paper } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Simple AI translation for papers
async function translateToSpanish(texts: { title: string; abstract: string }[]): Promise<{ titleEs: string; abstractEs: string }[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[Papers] No GEMINI_API_KEY, skipping translation');
    return texts.map(t => ({ titleEs: t.title, abstractEs: t.abstract }));
  }

  try {
    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Traduce estos títulos y abstracts de papers científicos al español latinoamericano.
Mantén la terminología técnica precisa pero hazlo accesible.
Responde SOLO con un JSON array con objetos {titleEs, abstractEs}.

Papers a traducir:
${JSON.stringify(texts, null, 2)}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the response
    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed) && parsed.length === texts.length) {
      return parsed;
    }

    console.log('[Papers] Translation response format unexpected, using originals');
    return texts.map(t => ({ titleEs: t.title, abstractEs: t.abstract }));
  } catch (error) {
    console.error('[Papers] Translation error:', error);
    return texts.map(t => ({ titleEs: t.title, abstractEs: t.abstract }));
  }
}

interface HFPaperResponse {
  paper: {
    id: string;
    title: string;
    summary: string;
    authors: { name: string }[];
    publishedAt: string;
  };
  title: string;
  summary: string;
  thumbnail?: string;
  upvotes: number;
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
    abstract: item.summary || item.paper.summary || '',
    abstractEs: translations[index]?.abstractEs || item.summary || item.paper.summary || '',
    authors: item.paper.authors?.map(a => a.name) || [],
    institution: item.organization?.fullname,
    arxivId: item.paper.id,
    upvotes: item.upvotes || 0,
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  try {
    const papers = await fetchHuggingFacePapers(dateParam || undefined);
    const dateStr = dateParam || new Date().toISOString().split('T')[0];

    return NextResponse.json({
      papers,
      date: dateStr,
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
