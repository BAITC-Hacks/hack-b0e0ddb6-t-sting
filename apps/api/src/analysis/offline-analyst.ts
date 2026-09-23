import type { PlanItem, Review, Scenario } from '../simulation/engine/types';
import type { AnalystReport, ToolTrace } from './contracts';

const fixed = (value: number) => value.toFixed(2);
const signed = (value: number) =>
  `${value < 0 ? '−' : '+'}${fixed(Math.abs(value))}`;

/** Explain the engine's review without needing a provider or inventing forecasts. */
export function offlineAnalysis(
  review: Review,
  scenario: Scenario,
  trace: ToolTrace[],
): AnalystReport {
  const districtName = (id: string) =>
    scenario.districts.find((district) => district.id === id)!.name;
  const indicatorName = (id: string) =>
    scenario.indicators.find((indicator) => indicator.id === id)!.name;
  const measureName = (id: string) =>
    scenario.measures.find((measure) => measure.id === id)!.name;
  const itemName = (item: PlanItem) =>
    `${measureName(item.measureId)}${item.districtId ? ` — ${districtName(item.districtId)}` : ' — весь город'}`;
  const { evaluation } = review;
  const strengths = [...review.moves]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map(
      (move) =>
        `${itemName(move.item)}: вклад ${signed(move.contribution)} в итоговый Score.`,
    );
  for (const district of evaluation.districts) {
    for (const indicator of scenario.indicators) {
      if (
        district.before[indicator.id] < 40 &&
        district.after[indicator.id] >= 40
      ) {
        strengths.push(
          `${districtName(district.districtId)}: ${indicator.name} вышел из критического диапазона (${fixed(district.before[indicator.id])} → ${fixed(district.after[indicator.id])}).`,
        );
      }
    }
  }
  for (const synergy of evaluation.synergies) {
    strengths.push(
      `Синергия ${synergy.measureIds.map(measureName).join(' + ')} усиливает район ${districtName(synergy.districtId)}.`,
    );
  }
  const weakest = [...evaluation.districts].sort(
    (a, b) => a.scoreAfter - b.scoreAfter,
  )[0];
  const risks = [
    `Худший район — ${districtName(weakest.districtId)} (${fixed(weakest.scoreAfter)}). Его результат даёт 30% итоговой оценки.`,
  ];
  for (const cell of evaluation.criticalCells) {
    risks.push(
      `${districtName(cell.districtId)}: ${indicatorName(cell.indicatorId)} = ${fixed(cell.value)}; значение ниже 40 добавляет штраф к Score.`,
    );
  }
  for (const move of review.moves) {
    const measure = scenario.measures.find(
      (candidate) => candidate.id === move.item.measureId,
    )!;
    if (measure.lag >= 4)
      risks.push(
        `${itemName(move.item)}: лаг ${measure.lag} из ${scenario.horizon}; за горизонт реализуется ${Math.round((100 * (scenario.horizon - measure.lag)) / scenario.horizon)}% эффекта.`,
      );
    if (move.grade === 'blunder')
      risks.push(
        `${itemName(move.item)} ухудшает план: вклад ${signed(move.contribution)}.`,
      );
    if (move.grade === 'mistake')
      risks.push(
        `${itemName(move.item)}: движок нашёл заметно более сильную замену.`,
      );
  }
  const consequences = [...evaluation.districts]
    .sort(
      (a, b) => b.scoreAfter - b.scoreBefore - (a.scoreAfter - a.scoreBefore),
    )
    .slice(0, 3)
    .map(
      (district) =>
        `${districtName(district.districtId)}: ${fixed(district.scoreBefore)} → ${fixed(district.scoreAfter)} (${signed(district.scoreAfter - district.scoreBefore)}).`,
    );
  consequences.push(
    'Охват всех направлений сам по себе не даёт бонуса: при ограниченном бюджете он может вытеснить помощь худшему району.',
  );
  const recommendations = review.topSwaps
    .slice(0, 2)
    .map(
      (swap) =>
        `${itemName(swap.replace)} → ${itemName(swap.with)}: Score ${fixed(swap.scoreAfter)} (${signed(swap.gain)}).`,
    );
  if (recommendations.length === 0)
    recommendations.push(
      'Улучшающих одиночных замен не найдено; сравните план с глобальным оптимумом.',
    );
  return {
    source: 'offline',
    summary: `Score ${fixed(evaluation.score)} (${signed(evaluation.score - review.baselineScore)} к бездействию), место ${review.rank} из ${review.totalPlans}. Бюджет: ${evaluation.cost} из ${scenario.budget}.`,
    strengths,
    risks,
    consequences,
    recommendations,
    trace,
  };
}
