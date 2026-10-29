import { Liveblocks } from "@liveblocks/node";
import { requireMember } from "@/lib/session";
import { ROOM_PREFIX } from "@/lib/collab";

// Issues Liveblocks tokens for the shared editors. Same gate as Server Actions:
// the passcode (if set) and a chosen member.
export async function POST() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) return new Response("Liveblocks is not configured.", { status: 503 });

  let member;
  try {
    member = await requireMember();
  } catch (e) {
    return new Response((e as Error).message, { status: 403 });
  }

  const session = new Liveblocks({ secret }).prepareSession(String(member.id), {
    userInfo: { name: member.name },
  });
  session.allow(`${ROOM_PREFIX}*`, session.FULL_ACCESS);
  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
