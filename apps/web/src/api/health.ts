export async function checkHealth(): Promise<void> {
  const response = await fetch('/api/health', {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('API is unavailable');

  const body: { status?: unknown; database?: unknown } | null =
    await response.json();
  if (body?.status !== 'ok' || body.database !== 'up') {
    throw new Error('Unexpected health response');
  }
}
