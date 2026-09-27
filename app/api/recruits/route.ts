import { body, route } from '@/lib/server/handler';
import { createRecruit, recruitInput } from '@/lib/server/service';

export const POST = route(async ({ req, lineUserId }) => createRecruit(lineUserId, recruitInput.parse(await body(req))));
