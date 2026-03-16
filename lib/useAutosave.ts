import { useEffect, useRef, useState } from 'react';

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutosave<T>({ data, onSave, delay = 3000, enabled = true }: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dataRef = useRef(data);
  const initialRef = useRef(true);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      dataRef.current = data;
      return;
    }
    if (!enabled) return;
    if (JSON.stringify(data) === JSON.stringify(dataRef.current)) return;
    dataRef.current = data;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setStatus('idle');
    timeoutRef.current = setTimeout(async () => {
      try {
        setStatus('saving');
        await onSaveRef.current(data);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, delay, enabled]);

  return { status };
}
