import { setAbortFlag } from '@/lib/abort-state';

export async function POST() {
  setAbortFlag(true);
  return Response.json({ success: true, message: 'Abort signal sent' });
}

export async function DELETE() {
  setAbortFlag(false);
  return Response.json({ success: true, message: 'Abort flag reset' });
}
