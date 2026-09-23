import { MEASURES } from './catalog';
import { DISTRICTS, INDICATORS } from './districts';
import type { ScenarioData } from './types';

/** Versioned, shared scenario: all teams play with the same inputs. */
export const SCENARIO: ScenarioData = {
  version: 'astana-v1',
  budget: 100,
  horizon: 8,
  districts: DISTRICTS,
  indicators: INDICATORS,
  measures: MEASURES,
  synergies: [
    { measureIds: ['M1', 'M2'], effects: { T1: 2 } },
    { measureIds: ['M10', 'M12'], effects: { B1: 2 } },
    { measureIds: ['M5', 'M6'], effects: { E2: 2 } },
  ],
  incompatibilities: [
    {
      measureIds: ['M1', 'M3'],
      sameDistrictOnly: false,
      reason: 'Выберите либо автобусные полосы, либо ЛРТ.',
    },
    {
      measureIds: ['M4', 'M7'],
      sameDistrictOnly: true,
      reason: 'Парк и школа в одном районе конфликтуют за участок.',
    },
    {
      measureIds: ['M5', 'M13'],
      sameDistrictOnly: true,
      reason:
        'Чистое топливо и модернизация сетей в одном районе дублируют программу.',
    },
  ],
  rules: [
    'Бюджет — не более 100 единиц.',
    'Выберите ровно 5 мер.',
    'Каждая мера выбирается максимум один раз.',
    'Районная мера требует район, городская применяется ко всему городу.',
    'Не более 2 мер из одного направления.',
    'Несовместимые меры запрещены.',
    'Для невалидного плана Score не рассчитывается.',
    'Порядок решений не влияет на результат.',
  ],
  examples: {
    strong: [
      { measureId: 'M7', districtId: 'nura' },
      { measureId: 'M8', districtId: 'nura' },
      { measureId: 'M10', districtId: 'nura' },
      { measureId: 'M12' },
      { measureId: 'M5', districtId: 'saryarka' },
    ],
    trap: [
      { measureId: 'M3', districtId: 'yesil' },
      { measureId: 'M7', districtId: 'yesil' },
      { measureId: 'M9', districtId: 'baikonur' },
      { measureId: 'M10', districtId: 'baikonur' },
      { measureId: 'M11', districtId: 'almaty' },
    ],
  },
};
