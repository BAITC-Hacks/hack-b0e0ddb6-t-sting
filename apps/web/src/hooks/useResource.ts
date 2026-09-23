import { useEffect, useState } from 'react';
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

/** Ignore superseded requests so an old response cannot replace the current plan. */
export function useResource<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    load: typeof load;
    attempt: number;
    state: Resource<T>;
  }>();
  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (active)
          setResult({ load, attempt, state: { status: 'success', data } });
      },
      (error: Error) => {
        if (active)
          setResult({
            load,
            attempt,
            state: { status: 'error', message: error.message },
          });
      },
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);
  const state: Resource<T> =
    result?.load === load && result.attempt === attempt
      ? result.state
      : { status: 'loading' };
  return { state, retry: () => setAttempt((value) => value + 1) };
}
