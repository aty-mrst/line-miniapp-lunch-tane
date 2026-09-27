import { body, route } from '@/lib/server/handler';
import { deleteShop, getShop, shopInput, updateShop } from '@/lib/server/service';

type P = { id: string };
export const GET = route<P>(({ lineUserId, params }) => getShop(lineUserId, params.id));
export const PATCH = route<P>(async ({ req, lineUserId, params }) => updateShop(lineUserId, params.id, shopInput.parse(await body(req))));
export const DELETE = route<P>(({ lineUserId, params }) => deleteShop(lineUserId, params.id));
