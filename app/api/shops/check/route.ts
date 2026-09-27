import { route } from '@/lib/server/handler';
import { checkShop, requireMe } from '@/lib/server/service';

export const GET = route(async ({ req, lineUserId }) => {
  await requireMe(lineUserId);
  const q = new URL(req.url).searchParams;
  return checkShop(q.get('url') ?? '', q.get('name') ?? '', q.get('exclude') ?? undefined);
});
