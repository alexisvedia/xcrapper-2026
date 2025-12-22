// Global abort flag stored in memory
// This works because the API route and this route run in the same process
let abortFlag = false;

export function setAbortFlag(value: boolean) {
  abortFlag = value;
}

export function getAbortFlag(): boolean {
  return abortFlag;
}

export async function POST() {
  abortFlag = true;
  return Response.json({ success: true, message: 'Abort signal sent' });
}

export async function DELETE() {
  abortFlag = false;
  return Response.json({ success: true, message: 'Abort flag reset' });
}
