// LIFF まわり。モック時は何もしない。
import { USE_MOCK } from './constants';

let idToken: string | null = null;

export async function initLiff(): Promise<void> {
  if (USE_MOCK) return;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) throw new Error('NEXT_PUBLIC_LIFF_ID が未設定です');
  const { default: liff } = await import('@line/liff');
  await liff.init({ liffId });
  if (!liff.isLoggedIn()) {
    liff.login();
    return new Promise(() => {}); // リダイレクト待ち
  }
  idToken = liff.getIDToken();
}

export function getIdToken() {
  return idToken;
}

export async function openExternal(url: string): Promise<void> {
  if (!USE_MOCK) {
    const { default: liff } = await import('@line/liff');
    if (liff.isInClient()) {
      liff.openWindow({ url, external: true });
      return;
    }
  }
  window.open(url, '_blank', 'noopener');
}
