import { route } from '@/lib/server/handler';
import { setReaction } from '@/lib/server/service';

type P = { id: string };
export const PUT = route<P>(({ lineUserId, params }) => setReaction(lineUserId, params.id, true));
export const DELETE = route<P>(({ lineUserId, params }) => setReaction(lineUserId, params.id, false));
