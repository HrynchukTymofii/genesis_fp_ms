# Team Sprint Hub (Спринт фінального проєкту)

Internal web app for the 6-person final-project team (Genesis × KSE). It covers who does what, what's due, what got done, and whether everyone is reporting, for the sprint from Oct 27 to Nov 16, 2026. The whole interface is in Ukrainian, and all "today" logic uses `Europe/Kyiv`.

Pages: Головна, Дошка (Kanban), Напрями ×6, Дорожня карта, Звіти, Зустрічі, **Ресурси**, Анкета команди, Ролі, Голосування за ідею.

**Ресурси** (`/resources`) is the shared link library:
- **Продукт**: the product deck (presentation), the live MVP, the numbers sheet and the repo. These also show up as quick links at the top of Home. Google Slides/Sheets/Docs, Drive files, Figma, Canva and Pitch links get an inline **Переглянути** (preview) button.
- **Лонг-ліст**, **Шорт-ліст**, **Зібрані дані** (Sensor Tower, scraped reviews), **Дослідження**, **Інше**: tables of links with a type, an optional direction and a note.
- The seed creates empty "slots" (deck, MVP, numbers sheet, long list, short list, Sensor Tower export…). Click **+ Додати посилання** to fill one in. Resources tied to a direction also appear on that direction's page.

## Stack

Next.js 16 (App Router, Server Actions, `proxy.ts`) · Tailwind CSS 4 · Postgres (Neon) · Drizzle ORM · zod · @dnd-kit · BlockNote (Ukrainian UI) · date-fns-tz · optional Vercel Blob.

## Environment

| Variable | Required | What it does |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Neon via Vercel Marketplace) |
| `LEAD_MEMBER_NAME` | yes | Exact name of the team lead, e.g. `Тимофій Гринчук` |
| `TEAM_PASSCODE` | no | If set, everyone enters it once at `/unlock` |
| `BLOB_READ_WRITE_TOKEN` | no | Enables "Прикріпити файл" on tasks and resources (10 MB max) |
| `LIVEBLOCKS_SECRET_KEY` | no | Live shared editing of meeting notes, task bodies and direction notes (merged edits + live cursors). Without it, the last save wins. Read at build time, so redeploy after adding it. |

## Deploy to Vercel

1. Push this folder to GitHub and import it in Vercel. If the repo root is the parent folder, set **Root Directory** to `web`.
2. In the Vercel project, go to **Storage → Create Database → Neon (Postgres)** and connect it to the project. This adds `DATABASE_URL`.
3. Add `LEAD_MEMBER_NAME` (and optionally `TEAM_PASSCODE`) under **Settings → Environment Variables**. For file uploads, also create a **Blob** store in Storage (this adds `BLOB_READ_WRITE_TOKEN`).
4. Locally:
   ```bash
   npm install
   npx vercel link
   npx vercel env pull .env.local   # brings DATABASE_URL etc.
   npm run db:migrate               # creates tables
   npm run db:seed                  # members, directions, ~40 tasks, phases, meetings, niches, resource slots
   ```
5. Deploy: `npx vercel --prod` (or just push to the main branch).

The seed is idempotent. Re-running it never duplicates rows and never overwrites task progress, meeting edits or roles set in the app.

## Local development

```bash
docker run -d --name sprinthub-pg -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=sprint -p 54329:5432 postgres:17-alpine
cp .env.example .env.local   # DATABASE_URL=postgres://postgres:pg@localhost:54329/sprint
npm run db:migrate && npm run db:seed
npm run dev
```

## Scripts

`dev`, `build`, `start`, `lint`, `test` (Vitest: role matching, the Done rule, Kyiv dates, plus a DB integration test for `moveTask` that runs when `DATABASE_URL` is set), `db:generate`, `db:migrate`, `db:seed`.

## Rules worth knowing

- **Identity:** there's no login. On first visit you pick your name, and it's kept in the `sprint_member` cookie for 180 days. "Змінити" in the sidebar switches it.
- **Done rule:** anyone can move a task between До виконання / В роботі / На перевірці. Only the task's reviewer (falling back to the direction's reviewer) or the lead can mark it Готово. The server enforces this, and the board rolls back with a message.
- **Role matching** (`lib/matching.ts`) works like this:
  - Owners: the lead owns MVP. The other 5 directions are brute-forced over all 5! permutations to maximise the total score.
  - Reviewers: each member reviews exactly one direction, never their own, and the lead reviews the deck by default.
  - Ties: the higher minimum score wins, then alphabetical order.
