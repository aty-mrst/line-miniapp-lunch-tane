import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from '../api/types';
import { getLineUserId } from './auth';

type Ctx<P> = { params: Promise<P> };

/** 認証 → 処理 → JSON。エラーは { error: { code, message } } で返す */
export function route<P = Record<string, never>>(fn: (a: { req: Request; lineUserId: string; params: P }) => Promise<unknown>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      const lineUserId = await getLineUserId(req);
      const params = ctx?.params ? await ctx.params : ({} as P);
      const data = await fn({ req, lineUserId, params });
      return data === undefined ? new NextResponse(null, { status: 204 }) : NextResponse.json(data);
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json({ error: { code: e.code, message: e.message, ...(e.data ? { shop: e.data } : {}) } }, { status: e.status });
      }
      if (e instanceof ZodError) {
        return NextResponse.json({ error: { code: 'INVALID', message: '入力内容を確認してください' } }, { status: 400 });
      }
      console.error(e);
      return NextResponse.json({ error: { code: 'SERVER', message: 'サーバーでエラーが起きました' } }, { status: 500 });
    }
  };
}

export async function body(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, 'INVALID', 'リクエストの形式が正しくありません');
  }
}
