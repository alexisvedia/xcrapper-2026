import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Generate a divulgación article from paper content
async function generateArticle(paper: {
  title: string;
  titleEs: string;
  abstract: string;
  abstractEs: string;
  authors: string[];
  arxivId?: string;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const groq = new Groq({ apiKey });

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

  const result = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2048,
  });

  const article = result.choices[0]?.message?.content || '';

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
