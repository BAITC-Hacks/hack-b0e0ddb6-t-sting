import type { LlmClient } from '../analysis/contracts';
import type { Brief, CouncilEvent } from './types';
import { unsupportedNumbers } from './numeric-facts';
import { offlineSpeech } from './offline-council';

function parseSpeech(
  raw: string,
  brief: Brief,
): { speech: string; amendmentId: string | null } {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid speech');
  const reply = value as Record<string, unknown>;
  if (
    typeof reply.speech !== 'string' ||
    !reply.speech.trim() ||
    reply.speech.trim().split(/\s+/u).length > 60
  )
    throw new Error('Invalid speech');
  if (
    reply.amendmentId !== null &&
    (typeof reply.amendmentId !== 'string' ||
      !brief.candidates.some((item) => item.id === reply.amendmentId))
  )
    throw new Error('Unknown amendment');
  if (unsupportedNumbers(reply.speech, brief.allowedNumbers).length)
    throw new Error('Unsupported number');
  return { speech: reply.speech.trim(), amendmentId: reply.amendmentId };
}

/** A malformed reply or provider failure affects this member only. */
export async function deputySpeech(
  brief: Brief,
  client: LlmClient | null,
  timeoutMs: number,
  round: 1 | 2 = 1,
  topic?: string,
): Promise<Extract<CouncilEvent, { type: 'speech' }>> {
  if (!client) return offlineSpeech(brief, round, topic);
  const controller = new AbortController();
  const delay = Math.min(Math.max(timeoutMs, 1), 12000);
  let timer!: ReturnType<typeof setTimeout>;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('Deadline exceeded'));
      }, delay);
    });
    const blocks = await Promise.race([
      client.complete({
        system: `Ты — ${brief.member.title} на заседании совета при акиме (вымышленный персонаж). Характер: ${brief.member.character}. Позиция задана: ${brief.stance}. Используй только числа из ФАКТЫ; выбирай поправку только из КАНДИДАТЫ. До 60 слов. Ответ только JSON {"speech":string,"amendmentId":string|null}.`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  facts: {
                    metricBefore: brief.metricBefore,
                    metricAfter: brief.metricAfter,
                    criticalCells: brief.criticalCells,
                    borderlineCells: brief.borderlineCells,
                    contributions: brief.contributions,
                    allowedNumbers: brief.allowedNumbers,
                  },
                  candidates: brief.candidates.map(
                    ({
                      id,
                      replace,
                      with: proposed,
                      scoreAfter,
                      delta,
                      cost,
                      impacts,
                    }) => ({
                      id,
                      replace,
                      with: proposed,
                      scoreAfter,
                      delta,
                      cost,
                      ownImpact: impacts.find(
                        (impact) => impact.roleId === brief.roleId,
                      ),
                    }),
                  ),
                  round,
                  topic,
                }),
              },
            ],
          },
        ],
        tools: [],
        signal: controller.signal,
      }),
      deadline,
    ]);
    if (
      controller.signal.aborted ||
      blocks.some((block) => block.type !== 'text')
    )
      throw new Error('Invalid response');
    const extraNumbers = topic
      ? Array.from(topic.matchAll(/[−+-]?\d+(?:[.,]\d+)?/g), (match) =>
          Number(match[0].replace('−', '-').replace(',', '.')),
        )
      : [];
    const parsed = parseSpeech(
      blocks
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join(''),
      { ...brief, allowedNumbers: [...brief.allowedNumbers, ...extraNumbers] },
    );
    return {
      type: 'speech',
      round,
      roleId: brief.roleId,
      stance: brief.stance,
      text: parsed.speech,
      amendmentId: parsed.amendmentId,
      source: 'llm',
      verified: true,
    };
  } catch {
    return offlineSpeech(brief, round, topic);
  } finally {
    clearTimeout(timer);
  }
}
