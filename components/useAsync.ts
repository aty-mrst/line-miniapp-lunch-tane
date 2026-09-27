'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** 読み込み・エラー・再読み込みをまとめたフック。setData で楽観的更新ができる */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ loading: boolean; error: unknown; data: T | null }>({ loading: true, error: null, data: null });
  const seq = useRef(0);
  const run = useCallback(() => {
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => n === seq.current && setState({ loading: false, error: null, data }),
      (error) => n === seq.current && setState({ loading: false, error, data: null }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  /** 画面を先に切り替えずに裏で取り直す */
  const refresh = useCallback(() => {
    const n = ++seq.current;
    fn().then((data) => n === seq.current && setState({ loading: false, error: null, data }), () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  const setData = useCallback((up: (d: T) => T) => setState((s) => (s.data ? { ...s, data: up(s.data) } : s)), []);
  return { ...state, reload: run, refresh, setData };
}
