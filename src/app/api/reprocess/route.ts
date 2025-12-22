import { NextResponse } from 'next/server';
import { reprocessTweet } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { fetchConfig } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tweetId, instruction } = body;

    if (!tweetId) {
      return NextResponse.json(
        { success: false, error: 'Missing tweetId' },
        { status: 400 }
      );
    }

    // Get the tweet
    const { data: tweet, error: fetchError } = await supabase
      .from('scraped_tweets')
      .select('*')
      .eq('id', tweetId)
      .single();

    if (fetchError || !tweet) {
      return NextResponse.json(
        { success: false, error: 'Tweet not found' },
        { status: 404 }
      );
    }

    // Get config for target language
    const config = await fetchConfig();

    // Reprocess with AI
    const newContent = await reprocessTweet(
      tweet.original_content,
      instruction || 'Parafrasea este contenido manteniendo la información clave',
      config.targetLanguage
    );

    // Update the tweet
    const { error: updateError } = await supabase
      .from('scraped_tweets')
      .update({ processed_content: newContent })
      .eq('id', tweetId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Error updating tweet' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newContent,
      message: 'Tweet reprocesado exitosamente',
    });
  } catch (error) {
    console.error('Reprocess error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
