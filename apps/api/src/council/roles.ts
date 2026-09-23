import type { CouncilMember, CouncilRoleId } from './types';

export const ROLE_IDS: CouncilRoleId[] = [
  'transport',
  'ecology',
  'social',
  'safety',
  'services',
  'ombudsman',
  'finance',
];

/** Fictional offices, each responsible for one independently computed metric. */
export const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: 'transport',
    title: 'Заместитель акима по транспорту',
    emoji: '🚌',
    metric: 'Вклад транспорта в средний балл',
    character: 'Прагматик-инженер',
  },
  {
    id: 'ecology',
    title: 'Заместитель по экологии',
    emoji: '🌳',
    metric: 'Вклад экологии в средний балл',
    character: 'Думает о зиме и смоге',
  },
  {
    id: 'social',
    title: 'Заместитель по социальной сфере',
    emoji: '🏫',
    metric: 'Вклад социальной сферы в средний балл',
    character: 'Говорит о детях и очередях',
  },
  {
    id: 'safety',
    title: 'Заместитель по безопасности',
    emoji: '🛡️',
    metric: 'Вклад безопасности в средний балл',
    character: 'Оперирует рисками',
  },
  {
    id: 'services',
    title: 'Заместитель по городскому хозяйству',
    emoji: '🔧',
    metric: 'Вклад городского хозяйства в средний балл',
    character: 'Беспокоится о надёжности сетей',
  },
  {
    id: 'ombudsman',
    title: 'Омбудсмен районов',
    emoji: '🏘️',
    metric: 'Худший район минус число критических значений',
    character: 'Голос отстающих районов',
  },
  {
    id: 'finance',
    title: 'Руководитель управления финансов',
    emoji: '💰',
    metric: 'Прирост Score на 10 единиц бюджета',
    character: 'Считает каждую единицу',
  },
  {
    id: 'chair',
    title: 'Председатель совета',
    emoji: '⚖️',
    metric: 'Итоговый Score',
    character: 'Нейтральный арбитр',
  },
];
