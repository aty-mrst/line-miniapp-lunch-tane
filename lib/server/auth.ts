import 'server-only';
import { ApiError } from '../api/types';

/** 開発用の認証バイパス（本番では絶対に有効にならない） */
export const DEV_AUTH = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_AUTH === 'true';

const cache = new Map<string, { sub: string; exp: number }>();

/**
 * リクエストの LINE ユーザーID（sub）を返す。
 * 本番：Authorization: Bearer <IDトークン> を LINE の verify API で検証する。クライアントが送るユーザーIDは信用しない。
 * 開発（NEXT_PUBLIC_DEV_AUTH=true）：x-dev-user ヘッダーのIDをそのまま使う。
 */
export async function getLineUserId(req: Request): Promise<string> {
  if (DEV_AUTH) {
    const dev = req.headers.get('x-dev-user');
    if (dev && /^U_dev_[a-z0-9_]+$/i.test(dev)) return dev;
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'ログインが必要です');

  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) return hit.sub;

  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) throw new ApiError(500, 'CONFIG', 'LINE_CHANNEL_ID が未設定です');
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: token, client_id: channelId }),
  });
  if (!res.ok) throw new ApiError(401, 'UNAUTHORIZED', 'ログインの有効期限が切れました。開き直してください');
  const json = (await res.json()) as { sub: string; exp: number };
  cache.set(token, { sub: json.sub, exp: json.exp * 1000 });
  if (cache.size > 1000) cache.clear();
  return json.sub;
}
