import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useResource } from '../../src/hooks/useResource';
describe('useResource', () => {
  it('loads, reports failure, and retries successfully', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('ready');
    const { result } = renderHook(() => useResource(load));
    expect(result.current.state.status).toBe('loading');
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'error',
        message: 'offline',
      }),
    );
    act(() => result.current.retry());
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'success',
        data: 'ready',
      }),
    );
  });
  it('shows loading for a changed request and ignores the superseded success', async () => {
    let resolve!: (value: string) => void;
    const old = () =>
      new Promise<string>((done) => {
        resolve = done;
      });
    const next = () => Promise.resolve('new plan');
    const { result, rerender } = renderHook(({ load }) => useResource(load), {
      initialProps: { load: old },
    });
    rerender({ load: next });
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'success',
        data: 'new plan',
      }),
    );
    await act(() => resolve('stale plan'));
    expect(result.current.state).toEqual({
      status: 'success',
      data: 'new plan',
    });
  });
  it('ignores a failure after unmount', async () => {
    let reject!: (reason: Error) => void;
    const load = () =>
      new Promise<string>((_, fail) => {
        reject = fail;
      });
    const { result, unmount } = renderHook(() => useResource(load));
    unmount();
    await act(() => reject(new Error('late failure')));
    expect(result.current.state).toEqual({ status: 'loading' });
  });
});
