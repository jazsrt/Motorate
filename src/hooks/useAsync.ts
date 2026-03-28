import { useState, useEffect, useCallback } from 'react';

interface AsyncState<T> {
  loading: boolean;
  error: Error | null;
  data: T | null;
}

/**
 * Hook for handling async operations with loading and error states
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: readonly unknown[] = []
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    loading: true,
    error: null,
    data: null,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableAsyncFn = useCallback(asyncFn, deps);

  const execute = useCallback(() => {
    setState({ loading: true, error: null, data: null });
    stableAsyncFn()
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((error) => setState({ loading: false, error, data: null }));
  }, [stableAsyncFn]);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    ...state,
    retry: execute,
  };
}
