import { route } from '@/lib/server/handler';
import { setInterest } from '@/lib/server/service';

type P = { id: string };
export const PUT = route<P>(({ lineUserId, params }) => setInterest(lineUserId, params.id, true));
export const DELETE = route<P>(({ lineUserId, params }) => setInterest(lineUserId, params.id, false));
