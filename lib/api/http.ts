// 本番API（Route Handlers）を呼ぶ実装。Phase 4 でサーバー側を実装する。
import { now } from '../clock';
import { ApiError, type Api, type ShopFilter } from './types';

/**
 * @param getIdToken LIFF の IDトークン
 * @param devUser 開発用（NEXT_PUBLIC_DEV_AUTH=true）。x-dev-user ヘッダーで送るユーザーID
 */
export function createHttpApi(getIdToken: () => string | null, devUser?: string): Api {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getIdToken() ?? ''}`, ...(devUser ? { 'x-dev-user': devUser } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'NETWORK', '通信エラー');
    }
    if (res.status === 204) return undefined as T;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, json?.error?.code ?? 'ERROR', json?.error?.message ?? 'エラー', json?.error?.shop);
    return json as T;
  }
  const q = (f?: ShopFilter) => (f ? `?walk=${encodeURIComponent(f.walk.join(','))}&budget=${encodeURIComponent(f.budget.join(','))}&genre=${encodeURIComponent(f.genre.join(','))}` : '');

  return {
    now,
    getMe: async () => {
      try {
        return await call('GET', '/api/me');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'NOT_REGISTERED') return null;
        throw e;
      }
    },
    register: (i) => call('POST', '/api/me', i),
    updateMe: (i) => call('PATCH', '/api/me', i),
    getHome: () => call('GET', '/api/home'),
    listShops: (f) => call('GET', `/api/shops${q(f)}`),
    checkShop: ({ url, name, excludeId }) =>
      call('GET', `/api/shops/check?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}${excludeId ? `&exclude=${excludeId}` : ''}`),
    getShop: (id) => call('GET', `/api/shops/${id}`),
    createShop: (i) => call('POST', '/api/shops', i),
    updateShop: (id, i) => call('PATCH', `/api/shops/${id}`, i),
    deleteShop: (id) => call('DELETE', `/api/shops/${id}`),
    setInterest: (id, on) => call(on ? 'PUT' : 'DELETE', `/api/shops/${id}/interest`),
    setReaction: (id, on) => call(on ? 'PUT' : 'DELETE', `/api/shops/${id}/reaction`),
    createRecruit: (i) => call('POST', '/api/recruits', i),
    cancelRecruit: (id) => call('DELETE', `/api/recruits/${id}`),
    setJoin: (id, on) => call(on ? 'PUT' : 'DELETE', `/api/recruits/${id}/join`),
  };
}
