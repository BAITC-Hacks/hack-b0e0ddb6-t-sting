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
assert.match(await page.text(), /<title>.*QOL-SIM.*<\/title>/i);
const icon = await fetch(new URL('/favicon.svg', webUrl), {
  signal: AbortSignal.timeout(10_000),
});
assert.equal(icon.status, 200, 'The favicon must be served');
assert.match(icon.headers.get('content-type') ?? '', /image\/svg\+xml/);

const plan = [
  { measureId: 'M7', districtId: 'nura' },
  { measureId: 'M8', districtId: 'nura' },
  { measureId: 'M10', districtId: 'nura' },
  { measureId: 'M12' },
  { measureId: 'M5', districtId: 'saryarka' },
];
async function request(path, body) {
  const response = await fetch(new URL(`/api/${path}`, webUrl), {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(35_000),
  });
  return { status: response.status, data: await response.json() };
}
const scenario = await request('scenario');
assert.equal(scenario.status, 200);
assert.equal(scenario.data.measures.length, 14);
assert.equal(scenario.data.budget, 100);
const validation = await request('plans/validate', { plan });
assert.equal(validation.data.cost, 95);
assert.deepEqual(validation.data.violations, []);
const review = await request('plans/review', { plan });
assert.equal(review.data.evaluation.score, 56.54);
assert.equal(review.data.scoreDelta, 3.99);
assert.equal(review.data.optimumGap, 0.69);
assert.equal(review.data.rank, 566);
assert.equal(review.data.totalPlans, 694395);
assert.equal(review.data.moves.length, 5);
const best = review.data.topSwaps[0];
const improved = plan.map((item) =>
  item.measureId === best.replace.measureId ? best.with : item,
);
const secondReview = await request('plans/review', { plan: improved });
assert.equal(secondReview.data.evaluation.score, 57.21);
const invalid = await request('plans/review', { plan: [] });
assert.equal(invalid.status, 422);
const analysis = await request('plans/analysis', { plan });
assert.ok(['llm', 'offline'].includes(analysis.data.source));
assert.ok(analysis.data.summary.length > 0);
assert.ok(analysis.data.recommendations.length > 0);
const leaderboard = await request('submissions');
assert.equal(leaderboard.status, 200);
assert.ok(Array.isArray(leaderboard.data));

process.stdout.write(
  'Live frontend, proxy, PostgreSQL, scenario, exact review, swap, analyst, and leaderboard checks passed.\n',
);
