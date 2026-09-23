import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { CityStep, IntroStep, RulesStep, ScoreStep } from './OverviewSteps';
import { LagStep } from './LagStep';
import { ExamplesStep } from './ExamplesStep';
import { ResultsStep } from './ResultsStep';
import './onboarding.css';
import './navigation.css';

const steps = [
  ['Что это', 'Симулятор плана развития города'],
  ['Город', 'Город: 5 районов, 10 показателей'],
  ['Правила', 'Правила плана'],
  ['Лаг', 'Лаг: долгие проекты работают меньше'],
  ['Итоговый балл', 'Как считается итоговый балл'],
  ['Примеры', 'Что на самом деле двигает балл'],
  ['Результаты', 'Что вы увидите после симуляции'],
];

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [lag, setLag] = useState(3);
  const [example, setExample] = useState<'school' | 'crossings'>('school');
  const [expanded, setExpanded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current!.focus();
  }, [step]);

  const content = [
    <IntroStep />,
    <CityStep />,
    <RulesStep />,
    <LagStep lag={lag} onLag={setLag} />,
    <ScoreStep />,
    <ExamplesStep example={example} onExample={setExample} />,
    <ResultsStep expanded={expanded} onToggle={() => setExpanded(!expanded)} />,
  ];
  return (
    <Modal
      title={`как это работает · ${step + 1} / 7`}
      onClose={onClose}
      className="onboarding"
      headerActions={
        <button className="onboarding-skip" onClick={onClose}>
          пропустить
        </button>
      }
    >
      <div className="onboarding-content">
        <h3 ref={heading} tabIndex={-1}>
          {steps[step][1]}
        </h3>
        {content[step]}
      </div>
      <footer className="onboarding-footer">
        <nav className="onboarding-dots" aria-label="Шаги обучения">
          {steps.map(([label], index) => (
            <button
              key={label}
              aria-label={`Шаг ${index + 1}: ${label}`}
              aria-current={index === step ? 'step' : undefined}
              className={index < step ? 'visited' : ''}
              onClick={() => setStep(index)}
            >
              <span />
            </button>
          ))}
        </nav>
        <div className="onboarding-actions">
          <button
            className="outline"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            назад
          </button>
          {step === 6 ? (
            <button className="primary" onClick={onClose}>
              собрать план →
            </button>
          ) : (
            <button className="primary" onClick={() => setStep(step + 1)}>
              далее →
            </button>
          )}
        </div>
      </footer>
    </Modal>
  );
}
