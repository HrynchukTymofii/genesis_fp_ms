import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { getCurrentMember } from "@/lib/session";
import { isUnlocked, UNLOCK_COOKIE } from "@/lib/passcode";
import { getDirections, getMembers } from "@/lib/queries";
import { AppDataProvider } from "@/components/AppData";
import { MemberPicker } from "@/components/MemberPicker";
import { PageContainer } from "@/components/PageContainer";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { TaskPanelProvider } from "@/components/TaskPanel";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: { default: "Спринт фінального проєкту", template: "%s · Спринт" },
  description: "Хто що робить, що горить, що зроблено — командний хаб на 20 днів спринту.",
};

export const viewport: Viewport = {
  // BlockNote needs this for the on-screen keyboard on mobile
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const themeCookie = jar.get("theme")?.value;
  const theme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : undefined;
  // Locked (TEAM_PASSCODE set, not entered yet): proxy sends everyone to /unlock.
  if (!(await isUnlocked(jar.get(UNLOCK_COOKIE)?.value))) {
    return (
      <html lang="uk" data-theme={theme} className={`${inter.variable} antialiased`}>
        <body className="font-sans">{children}</body>
      </html>
    );
  }
  const [me, members, directions] = await Promise.all([getCurrentMember(), getMembers(), getDirections()]);

  return (
    <html lang="uk" data-theme={theme} className={`${inter.variable} antialiased`}>
      <body className="font-sans">
        {!me ? (
          <MemberPicker members={members} />
        ) : (
          <AppDataProvider
            value={{
              me: { id: me.id, name: me.name, isLead: me.isLead },
              members: members.map((m) => ({ id: m.id, name: m.name, isLead: m.isLead })),
              directions: directions.map((d) => ({
                slug: d.slug,
                name: d.name,
                emoji: d.emoji,
                color: d.color,
                ownerId: d.ownerId,
                reviewerId: d.reviewerId,
              })),
              blobEnabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
            }}
          >
            <ToastProvider>
              <TaskPanelProvider>
                <div className="flex min-h-dvh flex-col md:flex-row">
                  <Sidebar theme={theme ?? "system"} />
                  <main className="min-w-0 flex-1">
                    <PageContainer>{children}</PageContainer>
                  </main>
                </div>
              </TaskPanelProvider>
            </ToastProvider>
          </AppDataProvider>
        )}
      </body>
    </html>
  );
}
