// Health check endpoint - NO dependencies to avoid ESM issues
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    status: 'ok',
    message: 'XCrapper API is working',
    timestamp: new Date().toISOString(),
    env: {
      hasTwitterKey: !!process.env.TWITTER_API_KEY,
      hasGroqKey: !!process.env.GROQ_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    }
  });
}
