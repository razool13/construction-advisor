import { useState, useRef, useEffect } from 'react';

/**
 * Debounced localStorage persistence hook.
 * Saves only after 500ms of inactivity.
 */
export function useStorage(key, initial) {
  const [data, setData] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = localStorage.getItem(key);
      if (!cancelled && stored) {
        const parsed = JSON.parse(stored);
        const valid = Array.isArray(initial)
          ? Array.isArray(parsed)
          : typeof parsed === typeof initial;
        if (valid) setData(parsed);
      }
    } catch {}
    if (!cancelled) setLoaded(true);
    return () => { cancelled = true; };
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, loaded, key]);

  return [data, setData, loaded];
}
