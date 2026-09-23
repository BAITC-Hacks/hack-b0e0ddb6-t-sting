import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CouncilSession } from '../../../../api/src/council/types';
import { councilEvents, getCouncilSession } from '../../../src/api/council';
import { CouncilPage } from '../../../src/features/council/CouncilPage';
import { scenario } from '../../fixtures/scenario';
import { opened, snapshot } from './fixtures';

vi.mock('../../../src/api/council', () => ({
  councilEvents: vi.fn(),
  getCouncilSession: vi.fn(),
  parseCouncilEvent: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getCouncilSession).mockReset();
  vi.mocked(councilEvents).mockReset();
});

function page() {
  return (
    <CouncilPage
      sessionId="session-1"
      scenario={scenario}
      onBack={vi.fn()}
      onApply={vi.fn()}
    />
  );
}

describe('council connection lifetime', () => {
  it('ignores a saved session that finishes loading after navigation away', async () => {
    let resolve!: (session: CouncilSession) => void;
    vi.mocked(getCouncilSession).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = render(page());
    unmount();
    resolve(snapshot([opened], 'running'));
    await Promise.resolve();
    expect(councilEvents).not.toHaveBeenCalled();
  });

  it('ignores a failed load after navigation away', async () => {
    let reject!: (reason: unknown) => void;
    vi.mocked(getCouncilSession).mockReturnValue(
      new Promise((_done, fail) => {
        reject = fail;
      }),
    );
    const { unmount } = render(page());
    unmount();
    reject(new Error('offline'));
    await Promise.resolve();
    expect(councilEvents).not.toHaveBeenCalled();
  });

  it('shows a safe message when a load rejects without an Error object', async () => {
    vi.mocked(getCouncilSession).mockRejectedValue('offline');
    render(page());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось загрузить заседание.',
    );
  });

  it('ignores an obsolete reconnect snapshot after the page unmounts', async () => {
    let resolve!: (session: CouncilSession) => void;
    vi.mocked(getCouncilSession)
      .mockResolvedValueOnce(snapshot([opened], 'running'))
      .mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        }),
      );
    const source = {
      onopen: null,
      onmessage: null,
      onerror: null as null | (() => void),
      close: vi.fn(),
    };
    vi.mocked(councilEvents).mockReturnValue(source as unknown as EventSource);
    const { unmount } = render(page());
    await waitFor(() => expect(councilEvents).toHaveBeenCalled());
    source.onerror?.();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Связь с заседанием прервана',
    );
    unmount();
    resolve(snapshot([opened, { type: 'closed' }], 'closed'));
    await Promise.resolve();
    expect(source.close).toHaveBeenCalledOnce();
  });
});
