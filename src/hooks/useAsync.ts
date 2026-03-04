import { useState, useEffect } from 'react';

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
  deps: any[] = []
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    loading: true,
    error: null,
    data: null,
  });

  const execute = () => {
    setState({ loading: true, error: null, data: null });
    asyncFn()
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((error) => setState({ loading: false, error, data: null }));
  };

  useEffect(() => {
    execute();
  }, deps);

  return {
    ...state,
    retry: execute,
  };
}
