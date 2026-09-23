import type { Plan } from './contracts';
import type {
  CouncilEvent,
  CouncilSession,
} from '../../../api/src/council/types';
import { isCouncilEvent, isPlan, isProtocol } from './councilSchema';

const base = '/api/council/sessions';

async function responseJson(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  try {
    const response = await fetch(path, {
      signal: AbortSignal.timeout(12000),
      ...init,
    });
    if (!response.ok) {
      if (response.status === 422)
        throw new Error(
          'План не прошёл проверку. Проверьте правила в конструкторе.',
        );
      if (response.status === 404)
        throw new Error(
          'Заседание не найдено. Ссылка устарела или сессия удалена.',
        );
      throw new Error('Совет временно недоступен. Повторите попытку.');
    }
    return await response.json();
  } catch (error) {
    if (
      error instanceof Error &&
      /План не прошёл|Заседание не найдено|Совет временно/.test(error.message)
    )
      throw error;
    throw new Error(
      'Не удалось связаться с сервером. Проверьте соединение и повторите попытку.',
      { cause: error },
    );
  }
}

export async function createCouncilSession(plan: Plan): Promise<string> {
  const result = await responseJson(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  if (
    !result ||
    typeof result !== 'object' ||
    !('sessionId' in result) ||
    typeof result.sessionId !== 'string' ||
    !result.sessionId
  ) {
    throw new Error('Сервис вернул некорректный ответ. Повторите попытку.');
  }
  return result.sessionId;
}

export async function getCouncilSession(id: string): Promise<CouncilSession> {
  const result = await responseJson(`${base}/${encodeURIComponent(id)}`);
  if (
    !result ||
    typeof result !== 'object' ||
    !('id' in result) ||
    result.id !== id ||
    !('events' in result) ||
    !Array.isArray(result.events) ||
    !('status' in result) ||
    !['running', 'closed', 'failed'].includes(String(result.status)) ||
    !('plan' in result) ||
    !isPlan(result.plan) ||
    !('createdAt' in result) ||
    typeof result.createdAt !== 'string' ||
    !('protocol' in result) ||
    !(result.protocol === null || isProtocol(result.protocol)) ||
    !result.events.every(isCouncilEvent)
  ) {
    throw new Error('Сервис вернул некорректную сессию. Повторите попытку.');
  }
  return result as CouncilSession;
}

export function councilEvents(id: string, after = 0): EventSource {
  return new EventSource(
    `${base}/${encodeURIComponent(id)}/events?after=${after}`,
  );
}

export function parseCouncilEvent(data: string): CouncilEvent | null {
  try {
    const value: unknown = JSON.parse(data);
    return isCouncilEvent(value) ? value : null;
  } catch {
    return null;
  }
}
