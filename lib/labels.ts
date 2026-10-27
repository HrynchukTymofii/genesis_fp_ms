// All user-facing Ukrainian labels for enum-like values live here.

export const TAG_COLORS = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export const TASK_STATUSES = ["todo", "doing", "review", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "До виконання",
  doing: "В роботі",
  review: "На перевірці",
  done: "Готово",
};

export const TASK_STATUS_COLOR: Record<TaskStatus, TagColor> = {
  todo: "gray",
  doing: "blue",
  review: "purple",
  done: "green",
};

export const REPORT_STATUSES = ["on_track", "at_risk", "blocked"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  on_track: "За планом",
  at_risk: "Є ризик",
  blocked: "Заблоковано",
};

export const REPORT_STATUS_COLOR: Record<ReportStatus, TagColor> = {
  on_track: "green",
  at_risk: "yellow",
  blocked: "red",
};

export const MEETING_KINDS = ["sync", "lock", "gate", "pitch", "other"] as const;
export const MEETING_KIND_LABEL: Record<string, string> = {
  sync: "Синк",
  lock: "Фіксація ідеї",
  gate: "Контрольна точка",
  pitch: "Пітч",
  other: "Інше",
};
export const MEETING_KIND_COLOR: Record<string, TagColor> = {
  sync: "blue",
  lock: "purple",
  gate: "orange",
  pitch: "red",
  other: "gray",
};

/** On the team form, a score of 8–10 needs a short "what can you do here" note. */
export const NOTE_REQUIRED_FROM = 8;

export const HOURS_OPTIONS = ["Менше 3", "3–6", "6–10", "10–15", "15+"];

export const PRESENT_OPTIONS = [
  { value: "yes", label: "Так" },
  { value: "maybe", label: "Можливо" },
  { value: "no", label: "Ні" },
];

export const VOTE_CRITERIA = [
  { key: "pain", short: "Біль", label: "Реальний біль, почутий на інтерв’ю" },
  { key: "reach", short: "Охоплення", label: "Можемо дістатися до користувачів у США" },
  { key: "buildable", short: "Реалізовність", label: "Реально зібрати веб-MVP з AI за 10 днів" },
  { key: "money", short: "Гроші", label: "Правдоподібний шлях до $500k/міс" },
  { key: "growth", short: "Ріст ринку", label: "Ринок росте й не перенасичений" },
] as const;
export type VoteKey = (typeof VOTE_CRITERIA)[number]["key"];

export const RESOURCE_CATEGORIES = [
  { key: "product", label: "Продукт", emoji: "🚀", hint: "Презентація, живе MVP, таблиця з цифрами, репозиторій." },
  { key: "longlist", label: "Лонг-ліст", emoji: "📋", hint: "Усі ідеї та ніші, які розглядали." },
  { key: "shortlist", label: "Шорт-ліст", emoji: "⭐", hint: "Фіналісти та їхні порівняння." },
  { key: "scraped", label: "Зібрані дані", emoji: "🗄", hint: "Sensor Tower, скрапінг відгуків, вивантаження." },
  { key: "research", label: "Дослідження", emoji: "🎙", hint: "Скрипти, записи та нотатки інтерв’ю." },
  { key: "other", label: "Інше", emoji: "📎", hint: "Усе, що не вмістилося вище." },
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]["key"];

export const RESOURCE_KINDS = [
  { key: "presentation", label: "Презентація", emoji: "🖥" },
  { key: "sheet", label: "Таблиця", emoji: "📊" },
  { key: "doc", label: "Документ", emoji: "📄" },
  { key: "data", label: "Дані / датасет", emoji: "🗃" },
  { key: "folder", label: "Папка", emoji: "📁" },
  { key: "design", label: "Дизайн", emoji: "🎨" },
  { key: "link", label: "Посилання", emoji: "🔗" },
  { key: "file", label: "Файл", emoji: "📎" },
] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number]["key"];
