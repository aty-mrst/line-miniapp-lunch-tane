import { body, route } from '@/lib/server/handler';
import { register, registerInput, requireMe, updateMe } from '@/lib/server/service';

export const GET = route(({ lineUserId }) => requireMe(lineUserId));
export const POST = route(async ({ req, lineUserId }) => register(lineUserId, registerInput.parse(await body(req))));
export const PATCH = route(async ({ req, lineUserId }) => updateMe(lineUserId, registerInput.parse(await body(req))));
