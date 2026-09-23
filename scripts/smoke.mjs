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

const council = await request('council/sessions', { plan });
assert.equal(council.status, 201);
const sessionPath = `council/sessions/${council.data.sessionId}`;
const stream = await fetch(new URL(`/api/${sessionPath}/events`, webUrl), {
  signal: AbortSignal.timeout(90_000),
});
assert.equal(stream.status, 200);
assert.match(stream.headers.get('content-type'), /text\/event-stream/);
assert.equal(stream.headers.get('x-accel-buffering'), 'no');
const frames = (await stream.text())
  .split(/\r?\n\r?\n/)
  .filter((frame) => frame.includes('data:'))
  .map((frame) => ({
    id: Number(frame.match(/^id: (\d+)/m)[1]),
    event: JSON.parse(frame.match(/^data: (.+)$/m)[1]),
  }));
assert.equal(frames[0].event.type, 'opened');
assert.equal(frames.at(-1).event.type, 'closed');
assert.deepEqual(
  frames.map((frame) => frame.id),
  frames.map((_, i) => i + 1),
);
const saved = await request(sessionPath);
assert.equal(saved.data.status, 'closed');
assert.deepEqual(
  saved.data.events,
  frames.map((frame) => frame.event),
);
assert.equal(
  saved.data.events.filter(
    (event) => event.type === 'speech' && event.round === 1,
  ).length,
  7,
);
assert.ok(saved.data.protocol.verified);
const checkedIds = saved.data.events
  .filter((event) => event.type === 'package-check' && event.valid)
  .map((event) => JSON.stringify(event.amendmentIds));
assert.ok(
  checkedIds.includes(
    JSON.stringify(saved.data.protocol.recommendedAmendmentIds),
  ),
);
const councilReview = await request('plans/review', {
  plan: saved.data.protocol.plan,
});
assert.equal(
  councilReview.data.evaluation.score,
  Number(saved.data.protocol.score.toFixed(2)),
);
const resumed = await fetch(new URL(`/api/${sessionPath}/events`, webUrl), {
  headers: { 'Last-Event-ID': String(frames.length - 1) },
  signal: AbortSignal.timeout(10_000),
});
const resumedText = await resumed.text();
assert.equal((resumedText.match(/^data:/gm) ?? []).length, 1);
assert.match(resumedText, /"type":"closed"/);
assert.equal((await request('council/sessions', { plan: [] })).status, 422);
assert.equal((await request('council/sessions/not-a-uuid')).status, 404);

if (saved.data.protocol.source === 'offline') {
  assert.equal(councilReview.data.evaluation.score, 57.21);
  assert.ok(
    saved.data.events.some(
      (event) =>
        event.type === 'package-check' && !event.valid && event.cost === 104,
    ),
  );
  const votes = saved.data.events.find((event) => event.type === 'votes').votes;
  assert.deepEqual(
    ['for', 'abstain', 'against'].map(
      (choice) => votes.filter((vote) => vote.vote === choice).length,
    ),
    [5, 1, 1],
  );
}

process.stdout.write(
  'Live frontend, proxy, PostgreSQL, scenario, review, analyst, leaderboard, council SSE/replay, packages and applied protocol checks passed.\n',
);
