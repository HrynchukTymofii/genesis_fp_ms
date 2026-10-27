import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = () => timestamp({ withTimezone: true });

export const members = pgTable("members", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  telegram: text(),
  isLead: boolean().notNull().default(false),
  createdAt: ts().notNull().defaultNow(),
});

export const formResponses = pgTable("form_responses", {
  id: serial().primaryKey(),
  memberId: integer()
    .notNull()
    .unique()
    .references(() => members.id, { onDelete: "cascade" }),
  hoursPerWeek: text(),
  awayDates: text(),
  willingToPresent: text(), // 'yes' | 'maybe' | 'no'
  skills: text(),
  nicheRanking: jsonb().$type<number[]>(),
  notes: text(),
  updatedAt: ts().notNull().defaultNow(),
});

export const interests = pgTable(
  "interests",
  {
    id: serial().primaryKey(),
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    directionSlug: text().notNull(),
    score: integer().notNull(),
    note: text(),
  },
  (t) => [uniqueIndex("interests_member_direction").on(t.memberId, t.directionSlug)],
);

export const directions = pgTable("directions", {
  slug: text().primaryKey(),
  name: text().notNull(),
  emoji: text().notNull(),
  color: text().notNull(),
  description: text().notNull().default(""),
  deliverables: text().notNull().default(""),
  notes: jsonb(),
  ownerId: integer().references(() => members.id, { onDelete: "set null" }),
  reviewerId: integer().references(() => members.id, { onDelete: "set null" }),
  // Lead's tweak to the suggested roles: show/apply this row with owner and reviewer swapped.
  swapSuggestion: boolean().notNull().default(false),
  sortOrder: integer().notNull().default(0),
});

export const phases = pgTable("phases", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  startDate: date({ mode: "string" }).notNull(),
  endDate: date({ mode: "string" }).notNull(),
  goal: text().notNull().default(""),
  gate: text().notNull().default(""),
  sortOrder: integer().notNull().default(0),
});

export const tasks = pgTable("tasks", {
  id: serial().primaryKey(),
  seedKey: text().unique(),
  title: text().notNull(),
  directionSlug: text()
    .notNull()
    .references(() => directions.slug),
  ownerId: integer().references(() => members.id, { onDelete: "set null" }),
  reviewerId: integer().references(() => members.id, { onDelete: "set null" }),
  status: text().notNull().default("todo"), // 'todo' | 'doing' | 'review' | 'done'
  dueDate: date({ mode: "string" }),
  body: jsonb(),
  doneAt: ts(),
  createdBy: integer().references(() => members.id, { onDelete: "set null" }),
  updatedBy: integer().references(() => members.id, { onDelete: "set null" }),
  createdAt: ts().notNull().defaultNow(),
  updatedAt: ts().notNull().defaultNow(),
});

export const taskLinks = pgTable("task_links", {
  id: serial().primaryKey(),
  taskId: integer()
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  url: text().notNull(),
  title: text(),
  kind: text().notNull().default("link"), // 'link' | 'file'
  createdBy: integer().references(() => members.id, { onDelete: "set null" }),
  createdAt: ts().notNull().defaultNow(),
});

export const reports = pgTable(
  "reports",
  {
    id: serial().primaryKey(),
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    // The sync meeting this report is for; it is due 2 hours before the sync starts.
    meetingId: integer().references(() => meetings.id, { onDelete: "set null" }),
    date: date({ mode: "string" }).notNull(), // Kyiv date of the sync
    done: text().notNull().default(""),
    next: text().notNull().default(""),
    blockers: text().notNull().default(""),
    status: text().notNull().default("on_track"), // 'on_track' | 'at_risk' | 'blocked'
    links: jsonb().$type<ReportLink[]>().notNull().default([]),
    createdAt: ts().notNull().defaultNow(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reports_member_meeting").on(t.memberId, t.meetingId)],
);

export type ReportLink = { url: string; title: string; kind: "link" | "file" };

export const meetings = pgTable("meetings", {
  id: serial().primaryKey(),
  seedKey: text().unique(),
  title: text().notNull(),
  startsAt: ts().notNull(),
  durationMin: integer().notNull().default(30),
  agenda: text().notNull().default(""),
  meetUrl: text(), // Google Meet (or any video call) link
  notes: jsonb(),
  kind: text().notNull().default("other"), // 'sync' | 'lock' | 'gate' | 'pitch' | 'other'
});

export const decisions = pgTable("decisions", {
  id: serial().primaryKey(),
  meetingId: integer().references(() => meetings.id, { onDelete: "set null" }),
  text: text().notNull(),
  createdBy: integer().references(() => members.id, { onDelete: "set null" }),
  createdAt: ts().notNull().defaultNow(),
});

export const niches = pgTable("niches", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  summary: text().notNull().default(""),
  dataNote: text().notNull().default(""),
  active: boolean().notNull().default(true),
});

export const votes = pgTable(
  "votes",
  {
    id: serial().primaryKey(),
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    nicheId: integer()
      .notNull()
      .references(() => niches.id, { onDelete: "cascade" }),
    pain: integer().notNull(),
    reach: integer().notNull(),
    buildable: integer().notNull(),
    money: integer().notNull(),
    growth: integer().notNull(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [uniqueIndex("votes_member_niche").on(t.memberId, t.nicheId)],
);

// Resources: links to the product deck, sheets (long list, short list),
// scraped data and other shared materials. A row may be an empty "slot"
// (url null) that someone fills in later.
export const resources = pgTable("resources", {
  id: serial().primaryKey(),
  seedKey: text().unique(),
  title: text().notNull(),
  url: text(),
  category: text().notNull().default("other"), // see lib/labels.ts RESOURCE_CATEGORIES
  kind: text().notNull().default("link"), // 'presentation' | 'sheet' | 'doc' | 'folder' | 'data' | 'design' | 'link' | 'file'
  directionSlug: text().references(() => directions.slug, { onDelete: "set null" }),
  note: text().notNull().default(""),
  sortOrder: integer().notNull().default(0),
  createdBy: integer().references(() => members.id, { onDelete: "set null" }),
  updatedBy: integer().references(() => members.id, { onDelete: "set null" }),
  createdAt: ts().notNull().defaultNow(),
  updatedAt: ts().notNull().defaultNow(),
});

export type Member = typeof members.$inferSelect;
export type Direction = typeof directions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskLink = typeof taskLinks.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type Decision = typeof decisions.$inferSelect;
export type Phase = typeof phases.$inferSelect;
export type Niche = typeof niches.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type FormResponse = typeof formResponses.$inferSelect;
export type Interest = typeof interests.$inferSelect;
