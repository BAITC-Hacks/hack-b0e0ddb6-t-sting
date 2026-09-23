import { describe, expect, it, vi } from 'vitest';
import {
  analyzePlan,
  getScenario,
  getSubmissions,
  reviewPlan,
  submitPlan,
  validatePlan,
} from '../../src/api/simulation';
import {
  analysis,
  review,
  scenario,
  submission,
  valid,
} from '../fixtures/scenario';
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
describe('simulation API', () => {
  it('loads and validates the complete scenario without POST options', async () => {
    const fetch = vi.fn().mockResolvedValue(response(scenario));
    vi.stubGlobal('fetch', fetch);
    expect(await getScenario()).toEqual(scenario);
    expect(fetch).toHaveBeenCalledWith('/api/scenario', {
      signal: expect.any(AbortSignal),
    });
  });
  it('posts plans, checks all response contracts and uses a longer analyst timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(valid))
      .mockResolvedValueOnce(response(review))
      .mockResolvedValueOnce(response(analysis))
      .mockResolvedValueOnce(response(submission))
      .mockResolvedValueOnce(response([submission]));
    vi.stubGlobal('fetch', fetch);
    const plan = scenario.examples.strong;
    expect(await validatePlan(plan)).toEqual(valid);
    expect(await reviewPlan(plan)).toEqual(review);
    expect(await analyzePlan(plan)).toEqual(analysis);
    expect(timeout).toHaveBeenLastCalledWith(30000);
    expect(await submitPlan('Астана', plan)).toEqual(submission);
    expect(await getSubmissions()).toEqual([submission]);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/api/plans/validate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      '/api/submissions',
      expect.objectContaining({
        body: JSON.stringify({ teamName: 'Астана', plan }),
      }),
    );
  });
  it.each([422, 503])(
    'reports a safe actionable error for HTTP %i',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(response({ private: 'secret' }, status)),
      );
      await expect(getScenario()).rejects.toThrow(
        status === 422
          ? 'План не прошёл проверку'
          : 'Сервис временно недоступен',
      );
    },
  );
  it.each([
    null,
    {},
    { ...scenario, districts: [] },
    {
      ...scenario,
      baseline: { ...scenario.baseline, districts: [{ districtId: 'nura' }] },
    },
  ])('rejects malformed nested scenario %j', async (value) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(value)));
    await expect(getScenario()).rejects.toThrow('некорректный ответ');
  });
  it('rejects malformed JSON without leaking internal details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>error</html>')),
    );
    await expect(getScenario()).rejects.toThrow('Проверьте соединение');
  });
  it('handles an aborted or unavailable request', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValue(new DOMException('Private detail', 'TimeoutError')),
    );
    await expect(getScenario()).rejects.toThrow(
      'Не удалось получить ответ сервера',
    );
  });
});
