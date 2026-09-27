import { route } from '@/lib/server/handler';
import { setJoin } from '@/lib/server/service';

type P = { id: string };
export const PUT = route<P>(({ lineUserId, params }) => setJoin(lineUserId, params.id, true));
export const DELETE = route<P>(({ lineUserId, params }) => setJoin(lineUserId, params.id, false));
