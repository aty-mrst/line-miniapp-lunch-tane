import { body, route } from '@/lib/server/handler';
import { createShop, listShops, shopInput } from '@/lib/server/service';

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

export const GET = route(({ req, lineUserId }) => {
  const q = new URL(req.url).searchParams;
  return listShops(lineUserId, { walk: list(q.get('walk')), budget: list(q.get('budget')), genre: list(q.get('genre')) });
});
export const POST = route(async ({ req, lineUserId }) => createShop(lineUserId, shopInput.parse(await body(req))));
