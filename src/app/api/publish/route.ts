import { NextResponse } from 'next/server';
import { postTweet } from '@/lib/twitter';
import { supabase } from '@/lib/supabase';

interface MediaItem {
  type: 'PHOTO' | 'VIDEO' | 'GIF';
  url: string;
  thumbnailUrl?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { queueItemId, text } = body;

    if (!queueItemId || !text) {
      return NextResponse.json(
        { success: false, error: 'Missing queueItemId or text' },
        { status: 400 }
      );
    }

    // Get media from the scraped tweet
    const { data: queueItem } = await supabase
      .from('publish_queue')
      .select('scraped_tweet_id')
      .eq('id', queueItemId)
      .single();

    let mediaUrls: string[] | undefined;

    if (queueItem?.scraped_tweet_id) {
      const { data: scrapedTweet } = await supabase
        .from('scraped_tweets')
        .select('media')
        .eq('id', queueItem.scraped_tweet_id)
        .single();

      if (scrapedTweet?.media && Array.isArray(scrapedTweet.media)) {
        mediaUrls = (scrapedTweet.media as MediaItem[]).map((m) => m.url);
      }
    }

    // Post the tweet with media
    const result = await postTweet(text, mediaUrls);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Delete queue item after publishing
    const { error: queueError } = await supabase
      .from('publish_queue')
      .delete()
      .eq('id', queueItemId);

    if (queueError) {
      console.error('Error deleting queue item:', queueError);
    }

    // Update tweet status to published (using queueItem from earlier query)
    if (queueItem?.scraped_tweet_id) {
      await supabase
        .from('scraped_tweets')
        .update({ status: 'published' })
        .eq('id', queueItem.scraped_tweet_id);
    }

    return NextResponse.json({
      success: true,
      tweetId: result.tweetId,
      message: 'Tweet publicado exitosamente',
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
