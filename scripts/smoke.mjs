import assert from 'node:assert/strict';

const [webUrl = 'http://localhost:5173', apiUrl = 'http://localhost:3000'] =
  process.argv.slice(2);

// This integration check runs against the live stack, separately from unit tests.
for (const baseUrl of [apiUrl, webUrl]) {
  const url = new URL('/api/health', baseUrl);
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200, `${url} must be healthy`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok', database: 'up' });
}

const page = await fetch(webUrl, { signal: AbortSignal.timeout(10_000) });
assert.equal(page.status, 200, 'The frontend must be served');
assert.match(await page.text(), /<title>TΞSTING<\/title>/);
const icon = await fetch(new URL('/favicon.svg', webUrl), {
  signal: AbortSignal.timeout(10_000),
});
assert.equal(icon.status, 200, 'The favicon must be served');
assert.match(icon.headers.get('content-type') ?? '', /image\/svg\+xml/);

process.stdout.write(
  'Live frontend, API proxy, and PostgreSQL checks passed.\n',
);
