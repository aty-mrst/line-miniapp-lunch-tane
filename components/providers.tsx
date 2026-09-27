'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Api, Me } from '@/lib/api/types';

/* ---------- API / 自分 ---------- */
type AppCtx = { api: Api; me: Me | null; setMe: (m: Me | null) => void };
const AppContext = createContext<AppCtx | null>(null);

export function AppProvider({ api, initialMe = null, children }: { api: Api; initialMe?: Me | null; children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(initialMe);
  return <AppContext.Provider value={{ api, me, setMe }}>{children}</AppContext.Provider>;
}
export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error('AppProvider がありません');
  return c;
}

/* ---------- 画面遷移 ---------- */
// 本番は Next のルーター、/dev/states ではメモリ上のルーターで動かすため抽象化する
export type Nav = { path: string; push: (p: string) => void; replace: (p: string) => void };
const NavContext = createContext<Nav | null>(null);
export const NavProvider = NavContext.Provider;
export function useNav() {
  const c = useContext(NavContext);
  if (!c) throw new Error('NavProvider がありません');
  return c;
}

/* ---------- トースト ---------- */
export type ToastState = { msg: string; kind: 'ok' | 'err'; id: number } | null;
type ToastCtx = { toast: ToastState; show: (msg: string, kind?: 'ok' | 'err') => void; clear: () => void };
const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ initial, children }: { initial?: { msg: string; kind?: 'ok' | 'err' }; children: ReactNode }) {
  // initial はデザイン確認用（自動で消さない）
  const [toast, setToast] = useState<ToastState>(initial ? { msg: initial.msg, kind: initial.kind ?? 'ok', id: 0 } : null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    clearTimeout(timer.current);
    setToast({ msg, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  const clear = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <ToastContext.Provider value={{ toast, show, clear }}>{children}</ToastContext.Provider>;
}
export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error('ToastProvider がありません');
  return c;
}
