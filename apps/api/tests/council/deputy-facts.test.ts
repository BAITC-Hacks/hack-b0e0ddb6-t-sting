import { expect, it } from 'vitest';
import { prepareCouncil } from '../../src/council/briefs';
import { deputySpeech } from '../../src/council/deputy-agent';
import { SCENARIO } from '../../src/simulation/engine/scenario';

it('accepts the engine-provided candidate metric after the amendment', async () => {
  const context = prepareCouncil(SCENARIO.examples.strong);
  const transport = context.briefs.find(
    (brief) => brief.roleId === 'transport',
  )!;
  const speech = await deputySpeech(
    transport,
    {
      complete: async () => [
        {
          type: 'text',
          text: JSON.stringify({
            speech: 'Моя метрика после поправки — 11.62.',
            amendmentId: 'swap:M5@saryarka>M3@yesil',
          }),
        },
      ],
    },
    12000,
  );
  expect(speech).toMatchObject({
    text: 'Моя метрика после поправки — 11.62.',
    source: 'llm',
    verified: true,
    amendmentId: 'swap:M5@saryarka>M3@yesil',
  });
});
