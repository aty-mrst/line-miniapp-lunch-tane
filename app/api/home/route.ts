import { route } from '@/lib/server/handler';
import { getHome } from '@/lib/server/service';

export const GET = route(({ lineUserId }) => getHome(lineUserId));
