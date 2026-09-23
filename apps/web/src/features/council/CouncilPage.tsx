import { useEffect, useRef, useState } from 'react';
import type {
  Amendment,
  CouncilEvent,
  CouncilMember,
} from '../../../../api/src/council/types';
import type { Plan, Scenario } from '../../api/contracts';
import {
  councilEvents,
  getCouncilSession,
  parseCouncilEvent,
} from '../../api/council';
import { itemLabel, number } from '../../components/format';
import { AmendmentBoard } from './AmendmentBoard';
import { CouncilMap } from './CouncilMap';
import { CouncilTable } from './CouncilTable';
import { appendEvent, sessionPhase, type CouncilPhase } from './events';
import { ProtocolPanel } from './ProtocolPanel';
import { SpeechFeed } from './SpeechFeed';
import './council.css';
import './council-detail.css';

const stages: { id: CouncilPhase; label: string }[] = [
  { id: 'preparation', label: 'подготовка' },
  { id: 'round1', label: 'раунд 1' },
  { id: 'amendments', label: 'поправки' },
  { id: 'round2', label: 'спор' },
  { id: 'packages', label: 'пакеты' },
  { id: 'vote', label: 'голосование' },
  { id: 'protocol', label: 'протокол' },
];

export function CouncilPage({
  sessionId,
  scenario,
  onBack,
  onApply,
}: {
  sessionId: string;
  scenario: Scenario;
  onBack: () => void;
  onApply: (plan: Plan) => void;
}) {
  const [events, setEvents] = useState<CouncilEvent[]>([]);
  const [status, setStatus] = useState<
    'loading' | 'connected' | 'disconnected' | 'complete' | 'error'
  >('loading');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Amendment | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let active = true;
    getCouncilSession(sessionId)
      .then((session) => {
        if (!active) return;
        setEvents(session.events);
        if (session.status !== 'running') {
          setStatus('complete');
          return;
        }
        const source = councilEvents(sessionId, session.events.length);
        sourceRef.current = source;
        source.onopen = () => {
          if (active) setStatus('connected');
        };
        source.onmessage = (message) => {
          if (!active) return;
          const event = parseCouncilEvent(message.data);
          const id = Number(message.lastEventId);
          if (!event || !Number.isSafeInteger(id) || id < 1) {
            setError(
              'Сервис прислал некорректное событие. Обновите заседание.',
            );
            setStatus('disconnected');
            return;
          }
          setEvents((current) => appendEvent(current, id, event));
          if (event.type === 'closed' || event.type === 'failed') {
            source.close();
            setStatus('complete');
          }
        };
        source.onerror = () => {
          if (!active) return;
          setStatus('disconnected');
          setError(
            'Связь с заседанием прервана. EventSource переподключается автоматически.',
          );
          getCouncilSession(sessionId)
            .then((snapshot) => {
              if (!active) return;
              setEvents((current) =>
                snapshot.events.length >= current.length
                  ? snapshot.events
                  : current,
              );
              if (snapshot.status !== 'running') {
                source.close();
                setStatus('complete');
                setError('');
              }
            })
            .catch(() => {
              /* Streaming retry remains available. */
            });
        };
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : 'Не удалось загрузить заседание.',
        );
        setStatus('error');
      });
    return () => {
      active = false;
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [sessionId, revision]);

  const visible = events.filter((event): event is CouncilEvent =>
    Boolean(event),
  );
  const opened = visible.find(
    (event): event is Extract<CouncilEvent, { type: 'opened' }> =>
      event.type === 'opened',
  );
  const members: CouncilMember[] = opened?.members ?? [];
  const amendments = visible
    .filter(
      (event): event is Extract<CouncilEvent, { type: 'amendment' }> =>
        event.type === 'amendment',
    )
    .map((event) => event.amendment)
    .sort((left, right) => right.delta - left.delta);
  const protocol = visible.find(
    (event): event is Extract<CouncilEvent, { type: 'protocol' }> =>
      event.type === 'protocol',
  )?.protocol;
  const phase = sessionPhase(visible);
  const failed = visible.find(
    (event): event is Extract<CouncilEvent, { type: 'failed' }> =>
      event.type === 'failed',
  );
  const focused =
    selected ??
    amendments.find((amendment) =>
      protocol?.recommendedAmendmentIds.includes(amendment.id),
    ) ??
    amendments[0] ??
    null;
  const retry = () => {
    setStatus('loading');
    setError('');
    setRevision((value) => value + 1);
  };
  const cost = opened?.plan.reduce(
    (sum, item) =>
      sum +
      scenario.measures.find((measure) => measure.id === item.measureId)!.cost,
    0,
  );

  return (
    <div className="council-page">
      <header className="council-heading">
        <div>
          <span className="muted">результаты / совет</span>
          <h1>Совет при акиме</h1>
          <p>
            Семь направлений формулы спорят о плане. Числа и поправки проверяет
            движок.
          </p>
        </div>
        <button className="outline" onClick={onBack}>
          ← к результатам
        </button>
      </header>
      <nav className="council-progress" aria-label="Ход заседания">
        {stages.map((stage, index) => (
          <button
            key={stage.id}
            className={
              stages.findIndex((entry) => entry.id === phase) >= index
                ? 'reached'
                : ''
            }
            onClick={() =>
              document
                .getElementById(
                  stage.id === 'preparation'
                    ? 'council-table'
                    : stage.id === 'round1' || stage.id === 'round2'
                      ? 'council-feed'
                      : stage.id === 'amendments' || stage.id === 'packages'
                        ? 'council-amendments'
                        : 'council-protocol',
                )
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            {String(index + 1).padStart(2, '0')} {stage.label}
          </button>
        ))}
      </nav>
      {status === 'loading' && (
        <p role="status" className="council-status">
          Загружаем заседание…
        </p>
      )}
      {(status === 'error' || status === 'disconnected') && (
        <div role="alert" className="council-error">
          <span>{error}</span>
          <button className="outline" onClick={retry}>
            обновить заседание ↻
          </button>
          {status === 'error' && (
            <button onClick={onBack}>к результатам</button>
          )}
        </div>
      )}
      {failed && (
        <div role="alert" className="council-error">
          Заседание остановлено: {failed.message}
        </div>
      )}
      {opened && (
        <div className="council-score">
          <span>ПЛАН ПЕРЕД СОВЕТОМ</span>
          <strong>Score {number(opened.score)}</strong>
          <span>
            {opened.plan.map((item) => itemLabel(item, scenario)).join(' · ')} ·
            стоимость {number(cost!)} / {scenario.budget}
          </span>
          <span className={status === 'connected' ? 'positive' : 'muted'}>
            {status === 'connected'
              ? '● прямой эфир'
              : status === 'complete'
                ? '● запись заседания'
                : '● подключение'}
          </span>
        </div>
      )}
      <div className="council-layout">
        <aside id="council-table">
          <CouncilTable members={members} events={visible} />
        </aside>
        <div className="council-main">
          <div id="council-feed">
            <SpeechFeed
              events={visible}
              members={members}
              amendments={amendments}
              scenario={scenario}
            />
          </div>
          <CouncilMap
            scenario={scenario}
            amendment={focused}
            objections={visible.filter(
              (event): event is Extract<CouncilEvent, { type: 'objection' }> =>
                event.type === 'objection',
            )}
            members={members}
          />
          <div id="council-amendments">
            <AmendmentBoard
              amendments={amendments}
              members={members}
              scenario={scenario}
              recommendedIds={protocol?.recommendedAmendmentIds ?? []}
              onApply={(amendment) => onApply(amendment.plan)}
              onSelect={setSelected}
            />
          </div>
          <div id="council-protocol">
            <ProtocolPanel
              events={visible}
              members={members}
              amendments={amendments}
              scenario={scenario}
              onApply={onApply}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
