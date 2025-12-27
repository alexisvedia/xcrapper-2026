import { fetchHomeTimeline, sleep } from '@/lib/twitter';
import { analyzeTweet, checkSimilarity } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { fetchConfig, cleanupOldTweets, getRecentPublishedContent, getPendingAndApprovedContent } from '@/lib/db';
import { getAbortFlag, setAbortFlag } from '@/lib/abort-state';

// Vercel serverless config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby plan limit

// Health check / debug endpoint
export async function GET() {
  return Response.json({
    status: 'ok',
    message: 'Scrape API is working',
    timestamp: new Date().toISOString()
  });
}

// Random delay helper (returns ms)
function randomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Extract URLs from text
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.match(urlRegex) || [];
}

// Smart truncate to 280 chars, preserving URLs and complete words
function smartTruncate(text: string, maxLength: number = 280): string {
  if (text.length <= maxLength) return text;

  // Extract URLs first
  const urls = extractUrls(text);
  let textWithoutUrls = text;
  for (const url of urls) {
    textWithoutUrls = textWithoutUrls.replace(url, '').trim();
  }

  // Calculate space needed for URLs
  const urlsText = urls.join(' ');
  const spaceForText = maxLength - urlsText.length - (urls.length > 0 ? 1 : 0); // -1 for space before URL

  if (spaceForText < 50) {
    // Not enough space, just hard truncate
    return text.slice(0, maxLength - 3) + '...';
  }

  // Truncate text at word boundary
  let truncated = textWithoutUrls;
  if (truncated.length > spaceForText) {
    truncated = truncated.slice(0, spaceForText);
    // Find last space to avoid cutting words
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > spaceForText * 0.7) {
      truncated = truncated.slice(0, lastSpace);
    }
    truncated = truncated.replace(/[.,;:!?]+$/, '').trim() + '...';
  }

  // Add URLs back
  if (urls.length > 0) {
    const withUrls = `${truncated} ${urlsText}`;
    if (withUrls.length <= maxLength) {
      return withUrls;
    }
    // If still too long, return just truncated text
    return truncated.slice(0, maxLength);
  }

  return truncated;
}

// Ensure URLs are in the processed content
function ensureUrlsIncluded(processedContent: string, originalContent: string): string {
  const originalUrls = extractUrls(originalContent);
  if (originalUrls.length === 0) return processedContent;

  const processedUrls = extractUrls(processedContent);
  const missingUrls = originalUrls.filter(url => !processedUrls.some(pUrl => pUrl.includes(url.slice(0, 30))));

  if (missingUrls.length === 0) return processedContent;

  // Add missing URLs at the end, respecting 280 char limit
  let result = processedContent;
  for (const url of missingUrls) {
    const withUrl = `${result} ${url}`;
    if (withUrl.length <= 280) {
      result = withUrl;
    }
  }

  return result;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const count = body.count || 30;

  // Reset abort flag at start
  setAbortFlag(false);

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Check if aborted (from global flag or request signal)
  const isAborted = () => getAbortFlag() || request.signal.aborted;

  const sendEvent = async (data: object) => {
    if (isAborted()) return false;
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      return true;
    } catch {
      // Writer closed - client disconnected
      setAbortFlag(true);
      return false;
    }
  };

  // Process in background
  (async () => {
    try {
      if (!await sendEvent({ type: 'status', message: 'Cargando configuración...' })) return;

      const config = await fetchConfig();

      // Cleanup old tweets first
      await sendEvent({ type: 'status', message: 'Limpiando tweets antiguos...' });
      const cleanupResult = await cleanupOldTweets(config.autoDeleteAfterDays || 7);
      if (cleanupResult.deleted > 0) {
        console.log(`[Cleanup] Deleted ${cleanupResult.deleted} old tweets`);
      }

      await sendEvent({ type: 'status', message: `Obteniendo ${count} tweets de Twitter...` });

      const allTweets = await fetchHomeTimeline(count);
      const fetchedCount = allTweets.length;

      // Notify how many were actually fetched from Twitter
      if (fetchedCount < count) {
        await sendEvent({
          type: 'status',
          message: `Twitter devolvió ${fetchedCount} de ${count} solicitados`
        });
      }

      // Filter tweets by age (maxTweetAgeDays)
      const maxAgeDays = config.maxTweetAgeDays || 2;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

      const tweets = allTweets.filter(tweet => {
        const tweetDate = new Date(tweet.createdAt);
        return tweetDate >= cutoffDate;
      });

      const filteredOut = allTweets.length - tweets.length;
      const total = tweets.length;

      // Build detailed message
      let startMessage = `Procesando ${total} tweets`;
      const details: string[] = [];

      if (fetchedCount < count) {
        details.push(`Twitter: ${fetchedCount}/${count}`);
      }
      if (filteredOut > 0) {
        details.push(`-${filteredOut} antiguos`);
      }
      if (details.length > 0) {
        startMessage += ` (${details.join(', ')})`;
      }

      await sendEvent({
        type: 'start',
        total,
        requested: count,
        fetched: fetchedCount,
        filteredByAge: filteredOut,
        message: startMessage,
      });

      // Get existing content for similarity check
      let existingContent: string[] = [];
      if (config.checkSimilarContent) {
        await sendEvent({ type: 'status', message: 'Cargando contenido existente para verificar duplicados...' });
        const [published, pending] = await Promise.all([
          getRecentPublishedContent(7),
          getPendingAndApprovedContent(),
        ]);
        existingContent = [...published, ...pending];
      }

      const results = {
        processed: 0,
        approved: 0,
        rejected: 0,
        duplicates: 0,
        skipped: 0,
        similar: 0,
        autoQueued: 0,
        breakingNews: 0,
        errors: 0,
      };

      for (let i = 0; i < tweets.length; i++) {
        // Check for abort before processing each tweet
        if (isAborted()) {
          await sendEvent({
            type: 'complete',
            success: true,
            message: 'Scraping cancelado por usuario',
            results,
          });
          break;
        }

        const tweet = tweets[i];
        const current = i + 1;

        // Add random delay between processing tweets (1.5-3 seconds)
        // This prevents detection from rapid-fire API/DB calls
        if (i > 0) {
          const delay = randomDelay(1500, 3000);
          // Check abort more frequently during delay
          const checkInterval = 200;
          for (let waited = 0; waited < delay; waited += checkInterval) {
            if (isAborted()) break;
            await sleep(Math.min(checkInterval, delay - waited));
          }
        }

        // Check again after delay
        if (isAborted()) {
          await sendEvent({
            type: 'complete',
            success: true,
            message: 'Scraping cancelado por usuario',
            results,
          });
          break;
        }

        try {
          // Check if tweet already exists
          const { data: existing } = await supabase
            .from('scraped_tweets')
            .select('id')
            .eq('tweet_id', tweet.id)
            .single();

          if (existing) {
            results.duplicates++;
            await sendEvent({
              type: 'progress',
              current,
              total,
              percent: Math.round((current / total) * 100),
              status: 'duplicate',
              author: `@${tweet.author.username}`,
              results,
              originalContent: tweet.text.slice(0, 200),
            });
            continue;
          }

          await sendEvent({
            type: 'processing',
            current,
            total,
            percent: Math.round((current / total) * 100),
            message: `Analizando con IA: @${tweet.author.username}`,
            author: `@${tweet.author.username}`,
            results,
          });

          // Build full text including quoted tweet if present
          let fullTweetText = tweet.text;
          if (tweet.quoted) {
            fullTweetText += `\n\n[TWEET CITADO de @${tweet.quoted.author.username}]: "${tweet.quoted.text}"`;
            if (tweet.quoted.url) {
              fullTweetText += ` ${tweet.quoted.url}`;
            }
          }

          // Analyze with AI (include quoted tweet context)
          const analysis = await analyzeTweet(fullTweetText, {
            targetLanguage: config.targetLanguage,
            minRelevanceScore: config.minRelevanceScore,
            rejectedPatterns: config.rejectedPatterns,
            aiSystemPrompt: config.aiSystemPrompt,
            aiModel: config.aiModel || 'llama-3.3-70b-versatile',
          });

          // Ensure URLs are preserved in processed content (from both main and quoted tweet)
          const rawProcessed = analysis.paraphrase || analysis.translation || tweet.text;
          // Combine URLs from main tweet and quoted tweet
          const allOriginalContent = tweet.quoted
            ? `${tweet.text} ${tweet.quoted.text} ${tweet.quoted.url || ''}`
            : tweet.text;
          const withUrls = ensureUrlsIncluded(rawProcessed, allOriginalContent);
          // Enforce 280 character limit
          const processedWithUrls = smartTruncate(withUrls, 280);

          // Check for similar content if enabled and tweet wasn't rejected
          if (config.checkSimilarContent && !analysis.shouldReject && existingContent.length > 0) {
            const isSimilar = checkSimilarity(processedWithUrls, existingContent);
            if (isSimilar) {
              results.similar++;
              await sendEvent({
                type: 'progress',
                current,
                total,
                percent: Math.round((current / total) * 100),
                status: 'similar',
                author: `@${tweet.author.username}`,
                message: 'Contenido similar ya existe',
                results,
                originalContent: tweet.text.slice(0, 200),
                processedContent: processedWithUrls.slice(0, 200),
                relevance: analysis.relevance,
              });
              continue;
            }
          }

          // Add processed content to existing content for future similarity checks in this batch
          if (!analysis.shouldReject) {
            existingContent.push(processedWithUrls);
          }

          // Check if should auto-queue
          // Option 1: Auto-publish with high score (autoPublishEnabled + score >= autoPublishMinScore)
          // Option 2: Auto-approve all pending (autoApproveEnabled + score >= minRelevanceScore)
          const shouldAutoQueue = !analysis.shouldReject && (
            (config.autoPublishEnabled && analysis.relevance >= (config.autoPublishMinScore || 9)) ||
            (config.autoApproveEnabled && analysis.relevance >= config.minRelevanceScore)
          );

          const finalStatus = analysis.shouldReject ? 'rejected' : (shouldAutoQueue ? 'approved' : 'pending');

          // Insert into database
          const { data: insertedTweet, error } = await supabase.from('scraped_tweets').insert({
            tweet_id: tweet.id,
            author_username: tweet.author.username,
            author_name: tweet.author.name,
            author_avatar: tweet.author.profileImageUrl || null,
            original_content: tweet.text,
            processed_content: processedWithUrls,
            original_url: tweet.url,
            relevance_score: analysis.relevance,
            ai_summary: analysis.summary,
            ai_model: analysis.model,
            rejection_reason: analysis.rejectionReason,
            status: finalStatus,
            media: tweet.media && tweet.media.length > 0 ? tweet.media : null,
            is_breaking_news: analysis.isBreakingNews,
          }).select().single();

          if (error) {
            console.error('Error inserting tweet:', error.message, error.details);
            results.errors++;
            await sendEvent({
              type: 'progress',
              current,
              total,
              percent: Math.round((current / total) * 100),
              status: 'error',
              author: `@${tweet.author.username}`,
              errorMessage: error.message,
              results,
            });
            continue;
          }

          // If auto-queue, add to publish queue
          if (shouldAutoQueue && insertedTweet) {
            // Breaking news goes to front of queue (position 0)
            if (analysis.isBreakingNews) {
              // Shift all existing items down by 1
              const { data: existingItems } = await supabase
                .from('publish_queue')
                .select('id, position')
                .order('position', { ascending: true });

              if (existingItems && existingItems.length > 0) {
                for (const item of existingItems) {
                  await supabase
                    .from('publish_queue')
                    .update({ position: item.position + 1 })
                    .eq('id', item.id);
                }
              }

              await supabase.from('publish_queue').insert({
                scraped_tweet_id: insertedTweet.id,
                custom_text: processedWithUrls,
                position: 0,
              });

              console.log(`[Breaking News] Added to front of queue: ${processedWithUrls.slice(0, 50)}...`);
            } else {
              // Regular tweets go to end of queue
              const { count } = await supabase
                .from('publish_queue')
                .select('*', { count: 'exact', head: true });

              await supabase.from('publish_queue').insert({
                scraped_tweet_id: insertedTweet.id,
                custom_text: processedWithUrls,
                position: count || 0,
              });
            }

            results.autoQueued++;
            if (analysis.isBreakingNews) {
              results.breakingNews++;
            }
          }

          results.processed++;
          if (analysis.shouldReject) {
            results.rejected++;
          } else {
            results.approved++;
          }

          // Determine display status
          let displayStatus = 'approved';
          if (analysis.shouldReject) {
            displayStatus = 'rejected';
          } else if (shouldAutoQueue && analysis.isBreakingNews) {
            displayStatus = 'breaking-news';
          } else if (shouldAutoQueue) {
            displayStatus = 'auto-queued';
          }

          await sendEvent({
            type: 'progress',
            current,
            total,
            percent: Math.round((current / total) * 100),
            status: displayStatus,
            author: `@${tweet.author.username}`,
            relevance: analysis.relevance,
            isBreakingNews: analysis.isBreakingNews,
            results,
            // Log details
            originalContent: tweet.text.slice(0, 200),
            processedContent: processedWithUrls.slice(0, 200),
            rejectionReason: analysis.rejectionReason,
          });
        } catch (tweetError) {
          const errorMsg = tweetError instanceof Error ? tweetError.message : 'Unknown error';
          console.error('Error processing tweet:', errorMsg);
          results.errors++;
          await sendEvent({
            type: 'progress',
            current,
            total,
            percent: Math.round((current / total) * 100),
            status: 'error',
            author: `@${tweet.author.username}`,
            errorMessage: errorMsg,
            results,
            originalContent: tweet.text.slice(0, 200),
          });
        }
      }

      await sendEvent({
        type: 'complete',
        success: true,
        message: 'Scraping completado',
        results,
      });
    } catch (error) {
      console.error('Scrape error:', error);
      await sendEvent({
        type: 'error',
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
