import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../utils/errors';

export function useLoad<T>(loader: () => Promise<T>, enabled = true) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError('');
    try { const value = await loader(); if (generation.current === current) setData(value); }
    catch (e) { if (generation.current === current) setError(errorMessage(e)); }
    finally { if (generation.current === current) setLoading(false); }
  }, [loader]);
  useEffect(() => {
    let active = true;
    // Strict Mode replays effects. Start only after its first cleanup so one
    // screen mount does not issue two identical requests.
    if (enabled) queueMicrotask(() => { if (active) void reload(); });
    else setLoading(false);
    return () => { active = false; generation.current++; };
  }, [reload, enabled]);
  return { data, loading, error, reload };
}
