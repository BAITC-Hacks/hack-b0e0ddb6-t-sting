import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  councilEvents,
  getCouncilSession,
  parseCouncilEvent,
} from '../../../src/api/council';
import { CouncilPage } from '../../../src/features/council/CouncilPage';
import { scenario } from '../../fixtures/scenario';
import { opened, snapshot, speech } from './fixtures';

vi.mock('../../../src/api/council', () => ({
  councilEvents: vi.fn(),
  getCouncilSession: vi.fn(),
  parseCouncilEvent: vi.fn((data: string) => JSON.parse(data)),
}));

beforeEach(() => {
  vi.mocked(getCouncilSession).mockReset().mockResolvedValue(snapshot());
  vi.mocked(councilEvents).mockReset();
  vi.mocked(parseCouncilEvent)
    .mockReset()
    .mockImplementation((data) => JSON.parse(data));
});

describe('live council stream', () => {
  it('appends live events and closes the stream after completion', async () => {
    vi.mocked(getCouncilSession).mockResolvedValue(
      snapshot([opened], 'running'),
    );
    const source = {
      onopen: null as null | (() => void),
      onmessage: null as null | ((message: MessageEvent) => void),
      onerror: null as null | (() => void),
      close: vi.fn(),
    };
    vi.mocked(councilEvents).mockReturnValue(source as unknown as EventSource);
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(councilEvents).toHaveBeenCalledWith('session-1', 1),
    );
    source.onopen?.();
    source.onmessage?.({
      data: JSON.stringify(speech),
      lastEventId: '2',
    } as MessageEvent);
    expect(await screen.findByText('Экология возражает.')).toBeInTheDocument();
    source.onmessage?.({
      data: JSON.stringify({ type: 'closed' }),
      lastEventId: '3',
    } as MessageEvent);
    await waitFor(() => expect(source.close).toHaveBeenCalled());
    expect(screen.getByText('● запись заседания')).toBeInTheDocument();
  });

  it('recovers from a stream interruption with the saved snapshot', async () => {
    vi.mocked(getCouncilSession)
      .mockResolvedValueOnce(snapshot([opened], 'running'))
      .mockResolvedValueOnce(snapshot([opened, speech], 'running'))
      .mockResolvedValueOnce(snapshot([opened, speech], 'closed'));
    const source = {
      onopen: null as null | (() => void),
      onmessage: null as null | ((message: MessageEvent) => void),
      onerror: null as null | (() => void),
      close: vi.fn(),
    };
    vi.mocked(councilEvents).mockReturnValue(source as unknown as EventSource);
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(councilEvents).toHaveBeenCalledWith('session-1', 1),
    );
    source.onerror?.();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Связь с заседанием прервана',
    );
    expect(await screen.findByText('Экология возражает.')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'обновить заседание ↻' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('● запись заседания')).toBeInTheDocument();
  });

  it('finishes the replay when a disconnected stream has already closed on the server', async () => {
    vi.mocked(getCouncilSession)
      .mockResolvedValueOnce(snapshot([opened], 'running'))
      .mockResolvedValueOnce(
        snapshot([opened, speech, { type: 'closed' }], 'closed'),
      );
    const source = {
      onopen: null,
      onmessage: null,
      onerror: null as null | (() => void),
      close: vi.fn(),
    };
    vi.mocked(councilEvents).mockReturnValue(source as unknown as EventSource);
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    await waitFor(() => expect(councilEvents).toHaveBeenCalled());
    source.onerror?.();
    expect(await screen.findByText('● запись заседания')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(source.close).toHaveBeenCalled();
    expect(screen.getByText('Экология возражает.')).toBeInTheDocument();
  });

  it('warns when an SSE message has no usable sequence ID', async () => {
    vi.mocked(getCouncilSession).mockResolvedValue(
      snapshot([opened], 'running'),
    );
    const source = {
      onopen: null,
      onmessage: null as null | ((message: MessageEvent) => void),
      onerror: null,
      close: vi.fn(),
    };
    vi.mocked(councilEvents).mockReturnValue(source as unknown as EventSource);
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    await waitFor(() => expect(councilEvents).toHaveBeenCalled());
    source.onmessage?.({
      data: JSON.stringify(speech),
      lastEventId: 'invalid',
    } as MessageEvent);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'некорректное событие',
    );
    expect(screen.queryByText('Экология возражает.')).not.toBeInTheDocument();
  });

  it('rejects a malformed SSE payload without adding it to the feed', async () => {
    vi.mocked(getCouncilSession).mockResolvedValue(
      snapshot([opened], 'running'),
    );
    vi.mocked(parseCouncilEvent).mockReturnValueOnce(null);
    const source = {
      onopen: null,
      onmessage: null as null | ((message: MessageEvent) => void),
      onerror: null,
      close: vi.fn(),
    };
    vi.mocked(councilEvents).mockReturnValue(source as unknown as EventSource);
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    await waitFor(() => expect(councilEvents).toHaveBeenCalled());
    source.onmessage?.({ data: '{}', lastEventId: '2' } as MessageEvent);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'некорректное событие',
    );
    expect(screen.queryByText('Экология возражает.')).not.toBeInTheDocument();
  });

  it('retains later live events if a reconnect snapshot lags and shows a terminal failure', async () => {
    vi.mocked(getCouncilSession)
      .mockResolvedValueOnce(snapshot([opened], 'running'))
      .mockResolvedValueOnce(snapshot([opened], 'running'));
    const source = {
      onopen: null,
      onmessage: null as null | ((message: MessageEvent) => void),
      onerror: null as null | (() => void),
      close: vi.fn(),
    };
    vi.mocked(councilEvents).mockReturnValue(source as unknown as EventSource);
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    await waitFor(() => expect(councilEvents).toHaveBeenCalled());
    source.onmessage?.({
      data: JSON.stringify(speech),
      lastEventId: '2',
    } as MessageEvent);
    expect(await screen.findByText('Экология возражает.')).toBeInTheDocument();
    source.onerror?.();
    await waitFor(() => expect(getCouncilSession).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Экология возражает.')).toBeInTheDocument();
    source.onmessage?.({
      data: JSON.stringify({ type: 'failed', message: 'Модель не ответила.' }),
      lastEventId: '3',
    } as MessageEvent);
    expect(
      await screen.findByText('Заседание остановлено: Модель не ответила.'),
    ).toBeInTheDocument();
    expect(source.close).toHaveBeenCalled();
  });

  it('keeps automatic reconnect available when the fallback snapshot also fails', async () => {
    vi.mocked(getCouncilSession)
      .mockResolvedValueOnce(snapshot([opened], 'running'))
      .mockRejectedValueOnce(new Error('temporary outage'));
    const source = {
      onopen: null,
      onmessage: null,
      onerror: null as null | (() => void),
      close: vi.fn(),
    };
    vi.mocked(councilEvents).mockReturnValue(source as unknown as EventSource);
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    await waitFor(() => expect(councilEvents).toHaveBeenCalled());
    source.onerror?.();
    await waitFor(() => expect(getCouncilSession).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'переподключается автоматически',
    );
    expect(source.close).not.toHaveBeenCalled();
  });

  it('closes the connection on unmount and ignores later callbacks', async () => {
    vi.mocked(getCouncilSession).mockResolvedValue(
      snapshot([opened], 'running'),
    );
    const source = {
      onopen: null as null | (() => void),
      onmessage: null as null | ((message: MessageEvent) => void),
      onerror: null as null | (() => void),
      close: vi.fn(),
    };
    vi.mocked(councilEvents).mockReturnValue(source as unknown as EventSource);
    const { unmount } = render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    await waitFor(() => expect(councilEvents).toHaveBeenCalled());
    unmount();
    source.onopen?.();
    source.onmessage?.({
      data: JSON.stringify(speech),
      lastEventId: '2',
    } as MessageEvent);
    source.onerror?.();
    expect(source.close).toHaveBeenCalledOnce();
    expect(getCouncilSession).toHaveBeenCalledOnce();
  });
});
