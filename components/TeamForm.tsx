"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveForm, type FormInput } from "@/app/actions/form";
import { HOURS_OPTIONS, NOTE_REQUIRED_FROM, PRESENT_OPTIONS } from "@/lib/labels";
import { DictationField } from "@/components/Dictation";

type Dir = { slug: string; name: string; emoji: string; description: string };

export function TeamForm({
  isLead,
  directions,
  initial,
}: {
  isLead: boolean;
  directions: Dir[];
  initial: FormInput;
}) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const needsNote = (i: FormInput["interests"][number]) => i.score >= NOTE_REQUIRED_FROM && !i.note.trim();
  const [pending, start] = useTransition();
  const set = <K extends keyof FormInput>(k: K, v: FormInput[K]) => {
    setSaved(false);
    setF((x) => ({ ...x, [k]: v }));
  };
  const interest = (slug: string) => f.interests.find((i) => i.directionSlug === slug)!;
  const setInterest = (slug: string, patch: Partial<FormInput["interests"][number]>) => {
    setSaved(false);
    setF((x) => ({
      ...x,
      interests: x.interests.map((i) => (i.directionSlug === slug ? { ...i, ...patch } : i)),
    }));
  };

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const missing = f.interests.filter(needsNote);
        if (missing.length) {
          setTriedSubmit(true);
          const names = missing.map((i) => directions.find((d) => d.slug === i.directionSlug)?.name).join(", ");
          setError(`Для оцінок 8–10 напишіть, що ви вмієте: ${names}.`);
          document.getElementById(`note-${missing[0].directionSlug}`)?.focus();
          return;
        }
        start(async () => {
          try {
            await saveForm(f);
            setSaved(true);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
    >
      <p className="-mt-4 text-sm text-text3">
        🎤 Біля текстових полів можна продиктувати відповідь голосом (українською).
      </p>

      <Section title="Про вас">
        <Label text="Скільки годин на тиждень можете приділяти?">
          <Segmented
            name="hours"
            options={HOURS_OPTIONS.map((h) => ({ value: h, label: h }))}
            value={f.hoursPerWeek}
            onChange={(v) => set("hoursPerWeek", v)}
          />
        </Label>
        <Label text="Дні до 16 листопада, коли вас не буде">
          <DictationField
            label="Дні, коли вас не буде"
            placeholder="Напр., 7–8 листопада — поїздка"
            value={f.awayDates}
            onChange={(v) => set("awayDates", v)}
          />
        </Label>
        <Label text="Готові презентувати свою частину на сцені?">
          <Segmented
            name="present"
            options={PRESENT_OPTIONS}
            value={f.willingToPresent}
            onChange={(v) => set("willingToPresent", v as FormInput["willingToPresent"])}
          />
        </Label>
      </Section>

      <Section title="Напрями" hint="Оцініть кожен від 1 до 10: наскільки хочете цим займатися. Це основа для підбору власників і рецензентів.">
        {directions.map((d) => {
          const i = interest(d.slug);
          const preassigned = isLead && d.slug === "mvp";
          return (
            <div key={d.slug} className="border-b border-border pb-5">
              <div className="font-medium">
                {d.emoji} {d.name}
                {preassigned && <span className="tag tag-blue ml-2">ваш напрям</span>}
              </div>
              <p className="mb-2 text-text2">{d.description}</p>
              <>
                <div className="mb-1.5 text-text2">
                  {d.slug === "mvp" && !isLead
                    ? "Наскільки хочете допомагати з MVP (розробка, AI-функції, аналітика, тестування)?"
                    : "Наскільки хочете цим займатися?"}
                </div>
                <div className="mb-3 flex flex-wrap gap-1" role="radiogroup" aria-label={`Інтерес: ${d.name}`}>
                  {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={i.score === n}
                      onClick={() => setInterest(d.slug, { score: n })}
                      className={`size-8 rounded border text-sm ${i.score === n ? "border-accent bg-accent text-white" : "border-border hover:bg-hover"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </>
              <div className="mb-1 text-sm text-text2">
                {d.slug === "mvp" && !isLead ? "Чим можете допомогти з MVP?" : "Що ви тут знаєте або вмієте?"}{" "}
                {i.score >= NOTE_REQUIRED_FROM ? (
                  <span className="text-danger">* обов’язково для оцінки 8–10</span>
                ) : (
                  <span className="text-text3">(необов’язково)</span>
                )}
              </div>
              <DictationField
                id={`note-${d.slug}`}
                required={i.score >= NOTE_REQUIRED_FROM}
                invalid={triedSubmit && needsNote(i)}
                label={`Що ви знаєте: ${d.name}`}
                placeholder={
                  d.slug === "mvp" && !isLead
                    ? "Напр., тестую, пишу промпти, знаю Figma"
                    : i.score >= NOTE_REQUIRED_FROM
                      ? "Коротко: досвід, інструменти, приклади"
                      : "Можна залишити порожнім"
                }
                value={i.note}
                onChange={(v) => setInterest(d.slug, { note: v })}
              />
            </div>
          );
        })}
      </Section>

      <Section title="Навички">
        <Label text="Загальні навички та інструменти">
          <DictationField
            multiline
            label="Навички та інструменти"
            placeholder="Figma, SQL, копірайтинг, Meta Ads…"
            value={f.skills}
            onChange={(v) => set("skills", v)}
          />
        </Label>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-border bg-bg px-4 py-3">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Зберігаю…" : "Зберегти мої відповіді"}
        </button>
        {saved && <span className="text-[var(--tag-green)]">Збережено. Можна редагувати будь-коли.</span>}
        {error && <span className="text-danger">{error}</span>}
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {hint && <p className="text-text2">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-text2">{text}</span>
      {children}
    </div>
  );
}

function Segmented({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="pill"
          data-active={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
