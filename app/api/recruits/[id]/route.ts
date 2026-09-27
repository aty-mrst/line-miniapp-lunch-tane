import { route } from '@/lib/server/handler';
import { cancelRecruit } from '@/lib/server/service';

export const DELETE = route<{ id: string }>(({ lineUserId, params }) => cancelRecruit(lineUserId, params.id));
