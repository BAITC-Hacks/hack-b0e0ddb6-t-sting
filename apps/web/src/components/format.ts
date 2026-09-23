import type { PlanItem, Scenario } from '../api/contracts';
export const number = (value: number) =>
  value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
export const signed = (value: number) =>
  `${value > 0 ? '+' : ''}${number(value)}`;
export const directions = {
  transport: 'Транспорт',
  ecology: 'Экология',
  social: 'Социальная среда',
  safety: 'Безопасность',
  services: 'Городские сервисы',
};
export function itemLabel(item: PlanItem, scenario: Scenario) {
  const district = scenario.districts.find(
    (value) => value.id === item.districtId,
  );
  return `${item.measureId} · ${district ? district.name : 'весь город'}`;
}
