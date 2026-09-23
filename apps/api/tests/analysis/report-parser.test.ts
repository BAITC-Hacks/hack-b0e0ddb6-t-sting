import { describe, expect, it } from 'vitest';
import { parseReport } from '../../src/analysis/report-parser';
import { finalReport } from './fixtures';

describe('strict analyst report parser', () => {
  it('accepts a complete report and trims human-facing text', () => {
    expect(
      parseReport(
        JSON.stringify({ ...finalReport, summary: ' Полезный итог ' }),
      ),
    ).toEqual({ ...finalReport, summary: 'Полезный итог' });
  });

  it.each([
    'broken',
    'null',
    '[]',
    '{}',
    JSON.stringify({ ...finalReport, source: 'llm' }),
    JSON.stringify({ ...finalReport, summary: '' }),
    JSON.stringify({ ...finalReport, summary: 42 }),
    JSON.stringify({ ...finalReport, summary: 'x'.repeat(2001) }),
    JSON.stringify({ ...finalReport, strengths: [] }),
    JSON.stringify({ ...finalReport, strengths: 'x' }),
    JSON.stringify({ ...finalReport, risks: [null] }),
    JSON.stringify({ ...finalReport, risks: [' '] }),
    JSON.stringify({ ...finalReport, risks: Array(13).fill('x') }),
  ])('rejects malformed or unexpected final output', (value) => {
    expect(() => parseReport(value)).toThrow();
  });
});
