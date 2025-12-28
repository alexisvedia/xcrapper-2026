import { NextResponse } from 'next/server';
import { Paper } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

  const papers: Paper[] = data.slice(0, 15).map((item, index) => ({
    id: `paper-${item.paper.id}`,
    title: item.title || item.paper.title,
    titleEs: item.title || item.paper.title, // Keep original, translate later
    abstract: item.summary || item.paper.summary || '',
    abstractEs: item.summary || item.paper.summary || '',
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
