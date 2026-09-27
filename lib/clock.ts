// 「現在時刻」。開発時だけ NEXT_PUBLIC_DEV_NOW で固定時刻から始められる（seed の募集時刻に合わせるため）。
// 本番では常に実時刻。サーバー・クライアント共通。

const loadedAt = Date.now();
const devBase =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_NOW ? new Date(process.env.NEXT_PUBLIC_DEV_NOW).getTime() : null;

export function now(): Date {
  // 固定時刻からの経過は実時間で進める
  return new Date(devBase === null ? Date.now() : devBase + (Date.now() - loadedAt));
}
