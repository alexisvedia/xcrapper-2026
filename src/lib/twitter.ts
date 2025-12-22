// Dynamic import to avoid ESM/CommonJS issues in Vercel serverless
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RettiwtClass: any = null;

async function loadRettiwt() {
  if (!RettiwtClass) {
    try {
      console.log('[Twitter] Loading rettiwt-api module...');
      const rettiwtModule = await import('rettiwt-api');
      RettiwtClass = rettiwtModule.Rettiwt;
      console.log('[Twitter] Module loaded successfully');
    } catch (err) {
      console.error('[Twitter] Failed to load rettiwt-api:', err);
      throw new Error(`Failed to load Twitter library: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return RettiwtClass;
}

// Random delay helper (returns ms)
function randomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Sleep helper
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize Rettiwt with API key from X Auth Helper extension
export async function getTwitterClient() {
  const apiKey = process.env.TWITTER_API_KEY;

  if (!apiKey) {
    throw new Error('TWITTER_API_KEY not configured. Use X Auth Helper extension to generate it.');
  }

  console.log('[Twitter] Initializing client with API key...');
  const Rettiwt = await loadRettiwt();

  try {
    const client = new Rettiwt({
      apiKey,
      logging: process.env.NODE_ENV === 'development',
    });
    console.log('[Twitter] Client initialized successfully');
    return client;
  } catch (err) {
    console.error('[Twitter] Failed to initialize client:', err);
    throw new Error(`Failed to initialize Twitter client: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export interface TweetMedia {
  type: 'PHOTO' | 'VIDEO' | 'GIF';
  url: string;
  thumbnailUrl?: string;
}

export interface QuotedTweet {
  id: string;
  text: string;
  author: {
    username: string;
    name: string;
  };
  url: string;
}

export interface RawTweet {
  id: string;
  text: string;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    name: string;
    profileImageUrl?: string;
  };
  url: string;
  media?: TweetMedia[];
  quoted?: QuotedTweet;
}

// Fetch home timeline (For You / recommended feed) with anti-detection delays
export async function fetchHomeTimeline(count: number = 50): Promise<RawTweet[]> {
  const client = await getTwitterClient();

  try {
    // Get recommended feed / "Para ti" (returns ~35 items per batch)
    const allTweets: RawTweet[] = [];
    let cursor: string | undefined;
    let batchCount = 0;

    while (allTweets.length < count) {
      // Add delay between batch requests (3-6 seconds) - mimics human scrolling
      if (batchCount > 0) {
        const delay = randomDelay(3000, 6000);
        console.log(`[Twitter] Waiting ${delay}ms before next batch...`);
        await sleep(delay);
      }

      const timeline = await client.user.recommended(cursor);
      batchCount++;

      if (!timeline.list || timeline.list.length === 0) break;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = timeline.list.map((tweet: any) => {
        // Extract quoted tweet if present
        const quotedTweet = tweet.quoted ? {
          id: tweet.quoted.id,
          text: tweet.quoted.fullText || '',
          author: {
            username: tweet.quoted.tweetBy?.userName || 'unknown',
            name: tweet.quoted.tweetBy?.fullName || tweet.quoted.tweetBy?.userName || 'Unknown',
          },
          url: `https://twitter.com/${tweet.quoted.tweetBy?.userName}/status/${tweet.quoted.id}`,
        } : undefined;

        return {
          id: tweet.id,
          text: tweet.fullText || '',
          createdAt: new Date(tweet.createdAt || Date.now()),
          author: {
            id: tweet.tweetBy?.id || '',
            username: tweet.tweetBy?.userName || 'unknown',
            name: tweet.tweetBy?.fullName || tweet.tweetBy?.userName || 'Unknown',
            profileImageUrl: tweet.tweetBy?.profileImage,
          },
          url: `https://twitter.com/${tweet.tweetBy?.userName}/status/${tweet.id}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          media: tweet.media?.map((m: any) => ({
            type: m.type as 'PHOTO' | 'VIDEO' | 'GIF',
            url: m.url,
            thumbnailUrl: m.thumbnailUrl,
          })),
          quoted: quotedTweet,
        };
      });

      allTweets.push(...mapped);
      cursor = timeline.next;

      if (!cursor) break;
    }

    return allTweets.slice(0, count);
  } catch (error) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = `${error.name}: ${error.message}`;
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }
    console.error('Error fetching timeline:', errorMessage);
    throw new Error(`Twitter API error: ${errorMessage}`);
  }
}

// Download media from URL and return as ArrayBuffer
async function downloadMedia(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`);
  }
  return response.arrayBuffer();
}

// Post a tweet with optional media
export async function postTweet(
  text: string,
  mediaUrls?: string[]
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  const client = await getTwitterClient();

  try {
    let mediaIds: { id: string }[] | undefined;

    // Upload media if provided
    if (mediaUrls && mediaUrls.length > 0) {
      mediaIds = [];
      for (const url of mediaUrls) {
        try {
          console.log('[Twitter] Downloading media from:', url.substring(0, 50) + '...');
          const buffer = await downloadMedia(url);
          console.log('[Twitter] Uploading media, size:', buffer.byteLength);
          const mediaId = await client.tweet.upload(buffer);
          if (mediaId) {
            mediaIds.push({ id: mediaId });
            console.log('[Twitter] Media uploaded with ID:', mediaId);
          }
        } catch (mediaError) {
          console.error('[Twitter] Error uploading media:', mediaError);
          // Continue without this media item
        }
      }
      // If no media was successfully uploaded, set to undefined
      if (mediaIds.length === 0) {
        mediaIds = undefined;
      }
    }

    // post() returns the tweet ID as a string
    const tweetId = await client.tweet.post({
      text,
      media: mediaIds
    });

    return {
      success: true,
      tweetId: tweetId || undefined
    };
  } catch (error) {
    console.error('Error posting tweet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
