import { NextResponse } from 'next/server';
import { getTwitterClient } from '@/lib/twitter';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Split text into tweet-sized chunks (max 280 chars)
function splitIntoTweets(text: string, maxLength: number = 270): string[] {
  const tweets: string[] = [];
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  let currentTweet = '';

  for (const paragraph of paragraphs) {
    // Clean markdown formatting
    const cleanParagraph = paragraph
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '')   // Remove italic
      .replace(/^#+\s*/gm, '') // Remove headers
      .trim();

    if (!cleanParagraph) continue;

    // If adding this paragraph exceeds limit, save current and start new
    if (currentTweet && (currentTweet.length + cleanParagraph.length + 2) > maxLength) {
      tweets.push(currentTweet.trim());
      currentTweet = '';
    }

    // If single paragraph is too long, split by sentences
    if (cleanParagraph.length > maxLength) {
      const sentences = cleanParagraph.match(/[^.!?]+[.!?]+/g) || [cleanParagraph];
      for (const sentence of sentences) {
        if ((currentTweet.length + sentence.length + 1) > maxLength) {
          if (currentTweet) tweets.push(currentTweet.trim());
          currentTweet = sentence.trim();
        } else {
          currentTweet += (currentTweet ? ' ' : '') + sentence.trim();
        }
      }
    } else {
      currentTweet += (currentTweet ? '\n\n' : '') + cleanParagraph;
    }
  }

  if (currentTweet.trim()) {
    tweets.push(currentTweet.trim());
  }

  return tweets;
}

export async function POST(request: Request) {
  try {
    const { paper } = await request.json();

    if (!paper || !paper.article) {
      return NextResponse.json(
        { error: 'Paper with article is required' },
        { status: 400 }
      );
    }

    const client = await getTwitterClient();

    // Build the thread
    const tweets: string[] = [];

    // First tweet: Hook/title as intro
    const intro = `🧵 ${paper.hook || paper.titleEs || paper.title}`;
    tweets.push(intro);

    // Middle tweets: Article content split into chunks
    const articleTweets = splitIntoTweets(paper.article, 270);
    tweets.push(...articleTweets);

    // Last tweet: Citation and link
    const citation = `📄 Paper: "${paper.titleEs || paper.title}"\n\n🔗 ${paper.url}`;
    tweets.push(citation);

    // Post the thread
    const postedIds: string[] = [];
    let replyToId: string | undefined;

    for (let i = 0; i < tweets.length; i++) {
      const tweetText = tweets[i];

      console.log(`[Thread] Posting tweet ${i + 1}/${tweets.length}: ${tweetText.substring(0, 50)}...`);

      const result = await client.tweet.post({
        text: tweetText,
        replyTo: replyToId
      });

      if (result) {
        postedIds.push(result);
        replyToId = result;
      }

      // Small delay between tweets to avoid rate limits
      if (i < tweets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      threadId: postedIds[0],
      tweetCount: postedIds.length,
      message: `Hilo publicado con ${postedIds.length} tweets`
    });

  } catch (error) {
    console.error('[Thread] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to publish thread',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
