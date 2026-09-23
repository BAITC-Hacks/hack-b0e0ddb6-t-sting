import { describe, expect, it, vi } from 'vitest';
import {
  createCouncilSession,
  getCouncilSession,
  councilEvents,
  parseCouncilEvent,
} from '../../src/api/council';

describe('council API', () => {
  it('creates and retrieves a session', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sessionId: 'abc' })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'abc',
            plan: [],
            events: [],
            protocol: null,
            status: 'running',
            createdAt: 'now',
          }),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    expect(await createCouncilSession([])).toBe('abc');
    expect(fetch).toHaveBeenCalledWith(
      '/api/council/sessions',
      expect.objectContaining({ method: 'POST', body: '{"plan":[]}' }),
    );
    expect((await getCouncilSession('abc')).id).toBe('abc');
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/council/sessions/abc',
      expect.any(Object),
    );
  });

  it('reports validation, missing session and malformed data', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 422 }))
        .mockResolvedValueOnce(new Response('', { status: 404 }))
        .mockResolvedValueOnce(new Response('{}')),
    );
    await expect(createCouncilSession([])).rejects.toThrow('План не прошёл');
    await expect(getCouncilSession('missing')).rejects.toThrow('не найдено');
    await expect(getCouncilSession('abc')).rejects.toThrow('некорректную');
  });

  it('constructs a replayable SSE connection', () => {
    const source = { close: vi.fn() };
    const EventSource = vi.fn(function () {
      return source;
    });
    vi.stubGlobal('EventSource', EventSource);
    expect(councilEvents('a b')).toBe(source);
    expect(EventSource).toHaveBeenCalledWith(
      '/api/council/sessions/a%20b/events?after=0',
    );
  });

  it('rejects malformed saved and streamed event payloads', async () => {
    const invalid = {
      id: 'abc',
      plan: [],
      events: [{ type: 'amendment', amendment: null }],
      protocol: null,
      status: 'running',
      createdAt: 'now',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(invalid))),
    );
    await expect(getCouncilSession('abc')).rejects.toThrow('некорректную');
    expect(parseCouncilEvent('{"type":"speech"}')).toBeNull();
    expect(
      parseCouncilEvent('{"type":"amendment","amendment":null}'),
    ).toBeNull();
    expect(parseCouncilEvent('not json')).toBeNull();
    expect(parseCouncilEvent('{"type":"closed"}')).toEqual({ type: 'closed' });
  });

  it('loads a completed session with a verified protocol', async () => {
    const protocol = {
      source: 'offline',
      verified: true,
      decision: 'accept',
      recommendedAmendmentIds: [],
      plan: [],
      score: 55,
      cost: 0,
      compromises: [],
      dissent: [],
      summary: 'Accepted.',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'abc',
            plan: [],
            events: [{ type: 'protocol', protocol }, { type: 'closed' }],
            protocol,
            status: 'closed',
            createdAt: 'now',
          }),
        ),
      ),
    );
    expect((await getCouncilSession('abc')).protocol).toEqual(protocol);
  });

  it('reports unavailable transport and malformed creation responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 503 }))
        .mockRejectedValueOnce(new Error('private transport detail'))
        .mockResolvedValueOnce(new Response('{}')),
    );
    await expect(createCouncilSession([])).rejects.toThrow(
      'временно недоступен',
    );
    await expect(getCouncilSession('abc')).rejects.toThrow(
      'Проверьте соединение',
    );
    await expect(createCouncilSession([])).rejects.toThrow(
      'некорректный ответ',
    );
  });
});
