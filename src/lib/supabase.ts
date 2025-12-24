import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbScrapedTweet {
  id: string;
  tweet_id: string;
  author_username: string;
  author_name: string | null;
  author_avatar: string | null;
  original_content: string;
  processed_content: string | null;
  original_url: string | null;
  relevance_score: number;
  ai_summary: string | null;
  rejection_reason: string | null;
  approval_reason: string | null;
  scraped_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'published';
}

export interface DbPublishQueue {
  id: string;
  scraped_tweet_id: string;
  custom_text: string;
  position: number;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
}

export interface DbConfig {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}
