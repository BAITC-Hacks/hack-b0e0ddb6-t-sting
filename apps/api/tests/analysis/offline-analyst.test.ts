import { describe, expect, it } from 'vitest';
import { offlineAnalysis } from '../../src/analysis/offline-analyst';
import { fixture } from './fixtures';

describe('offline city analyst', () => {
  it('explains strongest moves, resolved critical values, synergies, lag and best swap from engine facts', () => {
    const { review, scenario } = fixture();
    const report = offlineAnalysis(review, scenario, []);
    expect(report.source).toBe('offline');
    expect(report.summary).toContain('56.54');
    expect(report.summary).toContain('566');
    expect(report.strengths).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Школа — Нура'),
        expect.stringContaining('Поликлиника — Нура'),
        expect.stringContaining('Образование'),
        expect.stringContaining('Спорт + Сервисы'),
      ]),
    );
    expect(report.risks).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Нура'),
        expect.stringContaining('50%'),
      ]),
    );
    expect(report.consequences[0]).toContain('Нура: 42.00 → 53.13');
    expect(report.recommendations[0]).toContain('Парк — Сарыарка → ЛРТ — Нура');
    expect(report.recommendations[0]).toContain('+0.66');
  });

  it('explains unresolved critical values, harmful moves and no improving replacement', () => {
    const { review, scenario } = fixture();
    review.evaluation.criticalCells = [
      { districtId: 'nura', indicatorId: 'S1', value: 38 },
    ];
    review.evaluation.synergies = [];
    review.evaluation.districts[0].after.S1 = 38;
    review.evaluation.districts[0].after.S2 = 35;
    review.moves[0].grade = 'blunder';
    review.moves[0].contribution = -0.87;
    review.moves[1].grade = 'mistake';
    review.moves[3].grade = 'blunder';
    review.topSwaps = [];
    const report = offlineAnalysis(review, scenario, []);
    expect(report.risks).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Образование = 38.00'),
        expect.stringContaining('−0.87'),
        expect.stringContaining('Поликлиника'),
      ]),
    );
    expect(report.recommendations).toEqual([
      expect.stringContaining('не найдено'),
    ]);
    expect(report.strengths.join(' ')).not.toContain('критического');
    expect(report.risks.join(' ')).toContain('Сервисы — весь город');
  });
});
