import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { formResponses, interests } from "@/db/schema";
import { getDirections } from "@/lib/queries";
import { getCurrentMember } from "@/lib/session";
import { TeamForm } from "@/components/TeamForm";

export const metadata: Metadata = { title: "Анкета команди" };

export default async function FormPage() {
  const me = (await getCurrentMember())!;
  const [dirs, [resp], myInterests] = await Promise.all([
    getDirections(),
    db.select().from(formResponses).where(eq(formResponses.memberId, me.id)),
    db.select().from(interests).where(eq(interests.memberId, me.id)),
  ]);

  return (
    <div className="max-w-[760px]">
      <h1 className="page-title">Анкета команди</h1>
      <p className="mb-8 mt-2 text-text2">
        {resp ? "Ви вже відповіли — можна змінити будь-що й зберегти знову." : "Займе 5 хвилин. Відповіді допоможуть розподілити ролі в команді."}
      </p>
      <TeamForm
        isLead={me.isLead}
        directions={dirs.map((d) => ({ slug: d.slug, name: d.name, emoji: d.emoji, description: d.description }))}
        initial={{
          hoursPerWeek: resp?.hoursPerWeek ?? "",
          awayDates: resp?.awayDates ?? "",
          willingToPresent: (resp?.willingToPresent as "yes" | "maybe" | "no" | undefined) ?? "",
          skills: resp?.skills ?? "",
          interests: dirs.map((d) => {
            const i = myInterests.find((x) => x.directionSlug === d.slug);
            return { directionSlug: d.slug, score: i?.score ?? (me.isLead && d.slug === "mvp" ? 10 : 5), note: i?.note ?? "" };
          }),
        }}
      />
    </div>
  );
}
