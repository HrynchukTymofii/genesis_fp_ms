// Idempotent seed: upserts by natural keys, never duplicates on re-run.
// Run with `npm run db:seed` (reads DATABASE_URL and LEAD_MEMBER_NAME from .env.local / env).
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { sql } from "drizzle-orm";
import { fromZonedTime } from "date-fns-tz";

const TZ = "Europe/Kyiv";
const at = (local: string) => fromZonedTime(local, TZ);

const TELEGRAM: Record<string, string> = {
  "Андрій Павук": "@pavuk_andrii",
  "Аліна Горчинська": "@alina_horchynska",
  "Катерина Катрук": "@kat_katruk",
  "Олександра Фрицька": "@Alexxik",
  "Глєб Войтюк": "@hv_duarte16",
  "Тимофій Гринчук": "@HrynchukTim",
};
const MEMBERS = Object.keys(TELEGRAM);

const DIRECTIONS = [
  {
    slug: "mvp",
    name: "Продукт і MVP",
    emoji: "🛠",
    color: "blue",
    description:
      "Будуємо веб-MVP: квіз-воронка, одна ключова AI-функція, пейвол і аналітика. Власник закріплений заздалегідь, у підборі ролей напрям не бере участі.",
    deliverables: "Живе посилання на продукт\nПодії аналітики\nСценарій демо\nЗапасний запис екрана",
  },
  {
    slug: "research",
    name: "Дослідження користувачів",
    emoji: "🎙",
    color: "green",
    description:
      "Говоримо з реальними користувачами у США й перетворюємо це на болі та персону. Інтерв’ю — лише з людьми зі США.",
    deliverables: "Скрипт інтерв’ю\n10+ інтерв’ю у США\nСинтез болів із цитатами\nНотатки юзабіліті-тестів",
  },
  {
    slug: "market",
    name: "Ринок і конкуренти",
    emoji: "📊",
    color: "purple",
    description:
      "Доводимо, що ринок достатньо великий і росте, і знаємо конкурентів. Аналізуємо дані Sensor Tower для фіналістів.",
    deliverables:
      "Аналіз Sensor Tower\nTAM/SAM/SOM з джерелами\nРозрахунок шляху до $500k/міс\nРозбір конкурентів\nПозиціонування",
  },
  {
    slug: "money",
    name: "Монетизація та аналітика",
    emoji: "💰",
    color: "yellow",
    description:
      "Вирішуємо, як заробляємо, і доводимо юніт-економіку. Ведемо одну Google-таблицю з усіма цифрами.",
    deliverables: "Ціни та плани\nТаблиця з цифрами\nПрипущення воронки\nLTV і CAC з поясненням",
  },
  {
    slug: "growth",
    name: "Ріст і креативи",
    emoji: "📣",
    color: "orange",
    description:
      "Знаходимо канали й змушуємо людей клікати: канали, тексти воронки, креативи, рекламний тест.",
    deliverables: "План каналів\nМапа воронки\nТексти квізу та лендингу\nКреативи\nРезультати рекламного тесту",
  },
  {
    slug: "deck",
    name: "Презентація та історія",
    emoji: "🎤",
    color: "pink",
    description:
      "Перетворюємо все на одну історію, яку журі запам’ятає. Збираємо деку й проводимо репетиції.",
    deliverables: "Дека англійською (PPTX)\nСлайд із джерелами\nСписок питань і відповідей\nРепетиції",
  },
];

const PHASES = [
  {
    name: "0. Ролі",
    startDate: "2026-10-27",
    endDate: "2026-10-28",
    goal: "Анкету заповнено, власники й рецензенти призначені, фіналісти обрані, запит у Sensor Tower надіслано",
    gate: "У кожного є напрям і рецензент",
  },
  {
    name: "1. Валідація",
    startDate: "2026-10-28",
    endDate: "2026-10-30",
    goal: "3–5 інтерв’ю у США на кожного фіналіста, аналіз Sensor Tower, огляд цін",
    gate: "Ідею зафіксовано в пт, 30 жовтня",
  },
  {
    name: "2. Розробка",
    startDate: "2026-10-31",
    endDate: "2026-11-08",
    goal: "Воронка запущена 3 листопада, ключова AI-функція 7 листопада, усі чернетки до 5 листопада",
    gate: "3 експертні консультації проведено до 8 листопада",
  },
  {
    name: "3. Доказ",
    startDate: "2026-11-09",
    endDate: "2026-11-11",
    goal: "Рекламний тест, LTV/CAC на реальних цифрах, юзабіліті-тести, MVP завершено",
    gate: "Дека v1 11 листопада",
  },
  {
    name: "4. Шліфування",
    startDate: "2026-11-12",
    endDate: "2026-11-15",
    goal: "Передзахист, виправлення, звірені цифри, 2 репетиції",
    gate: "Фінальний прогін 15 листопада",
  },
  {
    name: "Пітч",
    startDate: "2026-11-16",
    endDate: "2026-11-16",
    goal: "10 хв пітч + 7 хв питань, 18:00",
    gate: "—",
  },
];

const SYNC_AGENDA = "Кожен власник показує, що зробив\nБлокери\nНайближчі дедлайни";
const MEETINGS = [
  {
    seedKey: "kickoff",
    title: "Кікоф",
    startsAt: at("2026-10-27T19:30:00"),
    durationMin: 40,
    kind: "other",
    agenda:
      "Очікування та години\nЯк ми працюємо\nВід шорт-ліста до фіналістів\nРолі за анкетою\nНаступні 72 години",
  },
  ...["2026-10-29", "2026-11-02", "2026-11-05", "2026-11-09", "2026-11-12"].map((d) => ({
    seedKey: `sync-${d}`,
    title: "Синк",
    startsAt: at(`${d}T20:00:00`),
    durationMin: 30,
    kind: "sync",
    agenda: SYNC_AGENDA,
  })),
  {
    seedKey: "idea-lock",
    title: "Фіксація ідеї",
    startsAt: at("2026-10-30T20:00:00"),
    durationMin: 20,
    kind: "lock",
    agenda:
      "Результати голосування та докази з інтерв’ю\nОбираємо одну ідею\nФіксуємо цільового користувача й географію",
  },
  {
    seedKey: "pre-defense",
    title: "Передзахист (дату уточнить школа)",
    startsAt: at("2026-11-12T18:00:00"),
    durationMin: 30,
    kind: "gate",
    agenda: "Дату надасть школа — відредагуйте, коли буде відомо.",
  },
  {
    seedKey: "final-rehearsal",
    title: "Фінальна репетиція",
    startsAt: at("2026-11-15T19:00:00"),
    durationMin: 60,
    kind: "gate",
    agenda: "Повний прогін пітчу з таймером\nПитання та відповіді\nОстанні правки деки",
  },
  {
    seedKey: "pitch",
    title: "Пітч",
    startsAt: at("2026-11-16T18:00:00"),
    durationMin: 17,
    kind: "pitch",
    agenda: "10 хв пітч + 7 хв питань і відповідей",
  },
];

const NICHES = [
  {
    name: "AI-тренер розмовної мови та вимови",
    summary: "Застосунок, що тренує говоріння та вимову з AI-співрозмовником.",
    dataNote: "~$167M (стори + веб), ~90% CAGR у сторах, лідер Speak ~32%.",
  },
  {
    name: "Віра: AI-компаньйон для молитви та Біблії",
    summary: "Щоденні молитви, читання Біблії та розмови з AI-компаньйоном.",
    dataNote: "~$111M, ~39% CAGR (сповільнюється), Hallow ~46%.",
  },
  {
    name: "Контроль підписок і витрат",
    summary: "Вузький клин без підключення банку: відстеження підписок і витрат.",
    dataNote: "~51% CAGR, лідера немає (~20%), дуже переповнений довгий хвіст.",
  },
  {
    name: "Тренування мозку для 50+",
    summary: "Ігри та вправи для пам’яті й уваги, створені саме для аудиторії 50+.",
    dataNote: "~$112M, ~19% CAGR, жоден гравець не орієнтується на 50+.",
  },
  {
    name: "Видалення персональних даних із брокерів даних",
    summary: "Сервіс, що знаходить і видаляє особисті дані з сайтів брокерів.",
    dataNote: "~$78M, лише веб, 4–5 веб-гравців.",
  },
];

type SeedTask = [key: string, title: string, due: string];
const TASKS: Record<string, SeedTask[]> = {
  deck: [
    ["team-form", "Команда: заповнити анкету команди", "2026-10-27"],
    ["team-roles", "Команда: підтвердити ролі та рецензентів", "2026-10-28"],
    ["team-vote", "Команда: голосування за фіксацію ідеї", "2026-10-30"],
    ["deck-experts", "Забронювати 3 експертні консультації", "2026-10-28"],
    ["deck-storyline", "Структура історії (сторилайн)", "2026-11-04"],
    ["deck-template", "Шаблон і дизайн деки", "2026-11-06"],
    ["deck-v1", "Дека v1: усі напрями разом, англійською, PPTX", "2026-11-11"],
    ["deck-sources", "Слайд із джерелами та перевірка узгодженості цифр", "2026-11-13"],
    ["deck-qa", "Підготувати список питань і 2 повні репетиції", "2026-11-15"],
  ],
  mvp: [
    ["mvp-sensortower", "Витягнути дані Sensor Tower для фіналістів", "2026-10-29"],
    ["mvp-skeleton", "Обрати стек, створити репозиторій, задеплоїти каркас", "2026-10-31"],
    ["mvp-funnel", "Квіз / онбординг-воронка запущена з подіями аналітики", "2026-11-03"],
    ["mvp-ai", "Ключова AI-функція v1 працює від початку до кінця", "2026-11-07"],
    ["mvp-paywall", "Пейвол або екран цін (fake door або Stripe test mode)", "2026-11-09"],
    ["mvp-polish", "Полірування, виправлення багів, фінальний деплой", "2026-11-11"],
    ["mvp-demo", "Сценарій демо та запасний запис екрана", "2026-11-13"],
  ],
  research: [
    ["res-channels", "Список каналів для пошуку респондентів у США", "2026-10-28"],
    ["res-script", "Скрипт проблемного інтерв’ю", "2026-10-28"],
    ["res-finalists", "3–5 проблемних інтерв’ю у США на кожного фіналіста", "2026-10-30"],
    ["res-10", "10+ інтерв’ю у США для обраної ніші", "2026-11-06"],
    ["res-synthesis", "Синтез болів: топ-болі, цитати, персона", "2026-11-07"],
    ["res-usability", "Юзабіліті-тести MVP з 3–5 користувачами", "2026-11-11"],
  ],
  market: [
    ["mkt-sensortower", "Проаналізувати дані Sensor Tower для фіналістів", "2026-10-30"],
    ["mkt-scorecard", "Скоркарта фіналістів для фіксації ідеї", "2026-10-30"],
    ["mkt-tam", "TAM / SAM / SOM з першоджерел", "2026-11-04"],
    ["mkt-500k", "Шлях до $500k на місяць: розрахунок", "2026-11-05"],
    ["mkt-teardown", "Розбір 5–8 конкурентів: функції, ціни, канали", "2026-11-05"],
    ["mkt-positioning", "Переваги та позиціонування, вхідні дані для слайда з роадмапом", "2026-11-09"],
  ],
  money: [
    ["money-pricing-scan", "Огляд цін і пейволів конкурентів", "2026-10-30"],
    ["money-sheet", "Створити одну Google-таблицю для всіх цифр", "2026-11-02"],
    ["money-model", "Модель цін і розподіл планів", "2026-11-05"],
    ["money-funnel", "Припущення воронки з джерелами", "2026-11-06"],
    ["money-ltv", "LTV і CAC з поясненням розрахунку", "2026-11-08"],
    ["money-adtest", "Оновити модель даними рекламного тесту", "2026-11-11"],
  ],
  growth: [
    ["growth-channels", "Канали конкурентів: Meta Ad Library, SimilarWeb", "2026-11-02"],
    ["growth-funnel-map", "Мапа воронки: реклама → квіз → пейвол", "2026-11-03"],
    ["growth-copy", "Тексти лендингу та квізу", "2026-11-03"],
    ["growth-creatives", "6–10 рекламних креативів", "2026-11-06"],
    ["growth-adtest", "Запустити рекламний тест на $50–100", "2026-11-08"],
    ["growth-results", "Результати рекламного тесту — в таблицю з цифрами", "2026-11-11"],
  ],
};

// Resource "slots": empty links the team fills in on the Resources page.
// Resources: links the team already has, plus empty "slots" to fill in on the Resources page.
const LONGLIST_SHEET = "https://docs.google.com/spreadsheets/d/1SMWY51Vx6jAMvIUfmL7kjOEahcbaFE0izAO0cZcIUlw/edit";
type SeedResource = {
  seedKey: string;
  title: string;
  url?: string;
  category: string;
  kind: string;
  directionSlug: string | null;
  note: string;
};
const RESOURCES: SeedResource[] = [
  { seedKey: "product-deck", title: "Презентація продукту (дека)", category: "product", kind: "presentation", directionSlug: "deck", note: "Головна дека для пітчу 16 листопада." },
  { seedKey: "product-mvp", title: "MVP — живе посилання", category: "product", kind: "link", directionSlug: "mvp", note: "" },
  { seedKey: "product-numbers", title: "Таблиця з усіма цифрами", category: "product", kind: "sheet", directionSlug: "money", note: "Одна таблиця: ціни, воронка, LTV/CAC, рекламний тест." },
  { seedKey: "product-repo", title: "Репозиторій", category: "product", kind: "link", directionSlug: "mvp", note: "" },
  { seedKey: "team-folder", title: "Папка команди «Команда 2»", url: "https://drive.google.com/drive/folders/18sIhveg5KRZOXPpJni9F1pFjcCkEdgXN", category: "product", kind: "folder", directionSlug: null, note: "Спільна папка на Google Drive з усіма матеріалами." },
  { seedKey: "school-brief", title: "Як робити фінальний проєкт (гайд школи, SDB 5.0)", url: "https://drive.google.com/file/d/1-PeOawlSnPZO4VwDpQQHyY-EtLekYA1c/view", category: "product", kind: "presentation", directionSlug: null, note: "Презентація школи: як має виглядати фінальний проєкт — вимоги, формат, що показати на пітчі." },
  { seedKey: "longlist", title: "Лонгліст ніш", url: `${LONGLIST_SHEET}#gid=1745808102`, category: "longlist", kind: "sheet", directionSlug: "market", note: "Таблиця «Лонгліст, шортліст»: аркуші «Як читати», «Лонгліст», «Критерії», «Скоринг»." },
  { seedKey: "shortlist", title: "Шортліст 20 і скоринг", url: `${LONGLIST_SHEET}#gid=1079584458`, category: "shortlist", kind: "sheet", directionSlug: "market", note: "Аркуш «Шортліст 20» у тій самій таблиці; поруч — «Для AppMagic» і «Зміни»." },
  { seedKey: "appmagic-markets", title: "Розміри ринку й темпи зростання ніш, 2022–2025 (AppMagic)", url: "https://docs.google.com/spreadsheets/d/1OLblyMf-Axy0d7aYgxQcI6h3h1bQVld6tDOADs4HYbI/edit", category: "scraped", kind: "sheet", directionSlug: "market", note: "Зведена, методологія, SimilarWeb і окремий аркуш на кожну нішу." },
  { seedKey: "similarweb", title: "SimilarWeb: збір трафіку", url: "https://docs.google.com/spreadsheets/d/1gDFjJYL6UxzpEwIa-aXvZQxxVjN-ITHGw96OboDVLCM/edit#gid=1", category: "scraped", kind: "sheet", directionSlug: "growth", note: "Інструкція, список ніш і зібраний трафік." },
  { seedKey: "sensortower", title: "Вивантаження Sensor Tower", category: "scraped", kind: "data", directionSlug: "market", note: "Сирі дані по фіналістах." },
  { seedKey: "scraped-reviews", title: "Зібрані відгуки зі сторів", category: "scraped", kind: "data", directionSlug: "research", note: "" },
  { seedKey: "interview-notes", title: "Нотатки та записи інтерв’ю", category: "research", kind: "folder", directionSlug: "research", note: "" },
];

async function main() {
  const { db } = await import("../db");
  const s = await import("../db/schema");

  const leadName = process.env.LEAD_MEMBER_NAME?.trim();
  if (leadName && !MEMBERS.includes(leadName)) {
    throw new Error(`LEAD_MEMBER_NAME="${leadName}" does not match any member name exactly.`);
  }
  if (!leadName) console.warn("⚠ LEAD_MEMBER_NAME is not set: nobody will be marked as lead.");

  // Members
  for (const name of MEMBERS) {
    await db
      .insert(s.members)
      .values({ name, telegram: TELEGRAM[name], isLead: name === leadName })
      .onConflictDoUpdate({
        target: s.members.name,
        set: { telegram: TELEGRAM[name], isLead: name === leadName },
      });
  }
  const members = await db.select().from(s.members);
  const lead = members.find((m) => m.isLead);

  // Directions: keep owner/reviewer/notes on re-run; mvp defaults to the lead.
  for (const [i, d] of DIRECTIONS.entries()) {
    await db
      .insert(s.directions)
      .values({ ...d, sortOrder: i, ownerId: d.slug === "mvp" ? (lead?.id ?? null) : null })
      .onConflictDoUpdate({
        target: s.directions.slug,
        set: {
          name: d.name,
          emoji: d.emoji,
          color: d.color,
          description: d.description,
          deliverables: d.deliverables,
          sortOrder: i,
        },
      });
  }
  if (lead) {
    await db
      .update(s.directions)
      .set({ ownerId: lead.id })
      .where(sql`${s.directions.slug} = 'mvp' and ${s.directions.ownerId} is null`);
  }

  for (const [i, p] of PHASES.entries()) {
    await db
      .insert(s.phases)
      .values({ ...p, sortOrder: i })
      .onConflictDoUpdate({ target: s.phases.name, set: { ...p, sortOrder: i } });
  }

  // Meetings: don't overwrite edits made in the app (dates may have been changed).
  for (const m of MEETINGS) {
    await db.insert(s.meetings).values(m).onConflictDoNothing({ target: s.meetings.seedKey });
  }

  for (const n of NICHES) {
    await db
      .insert(s.niches)
      .values(n)
      .onConflictDoUpdate({ target: s.niches.name, set: { summary: n.summary, dataNote: n.dataNote } });
  }

  // Tasks: insert once, never overwrite progress made in the app.
  let taskCount = 0;
  for (const [slug, list] of Object.entries(TASKS)) {
    for (const [seedKey, title, dueDate] of list) {
      await db
        .insert(s.tasks)
        .values({ seedKey, title, directionSlug: slug, dueDate, status: "todo" })
        .onConflictDoNothing({ target: s.tasks.seedKey });
      taskCount++;
    }
  }

  for (const [i, r] of RESOURCES.entries()) {
    await db
      .insert(s.resources)
      .values({ ...r, url: r.url ?? null, sortOrder: i })
      // Fill an empty slot with a known link, but never overwrite a link set in the app.
      .onConflictDoUpdate({
        target: s.resources.seedKey,
        set: { url: sql`coalesce(${s.resources.url}, excluded.url)` },
      });
  }

  console.log(
    `✓ Seeded ${members.length} members, ${DIRECTIONS.length} directions, ${PHASES.length} phases, ` +
      `${MEETINGS.length} meetings, ${NICHES.length} niches, ${taskCount} tasks, ${RESOURCES.length} resources.` +
      (lead ? ` Lead: ${lead.name}.` : ""),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
