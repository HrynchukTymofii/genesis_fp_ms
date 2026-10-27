"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Minimal typings for the Web Speech API (Chrome/Edge/Safari expose it, some prefixed).
type RecognitionResultEvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};
const useSupported = () => useSyncExternalStore(noop, () => getCtor() != null, () => false);

/** Mic button: dictates Ukrainian speech and appends the text via onText. */
export function DictateButton({
  onText,
  label,
  multiline = false,
}: {
  onText: (text: string) => void;
  label: string;
  multiline?: boolean;
}) {
  const supported = useSupported();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);
  useEffect(() => () => rec.current?.stop(), []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = getCtor()!;
    const r = new Ctor();
    r.lang = "uk-UA";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onTextRef.current(e.results[i][0].transcript.trim());
      }
    };
    r.onerror = (e) =>
      setError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Дозвольте доступ до мікрофона в браузері."
          : e.error === "no-speech"
            ? "Нічого не почуто, спробуйте ще раз."
            : "Не вдалося розпізнати мову.",
      );
    r.onend = () => setListening(false);
    setError(null);
    rec.current = r;
    r.start();
    setListening(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? `Зупинити диктування: ${label}` : `Продиктувати: ${label}`}
        title={listening ? "Зупинити диктування" : "Продиктувати відповідь"}
        className={`absolute right-2 inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-1.5 text-base transition-colors ${
          multiline ? "top-2" : "top-1/2 -translate-y-1/2"
        } ${
          listening
            ? "bg-[var(--tag-red-bg)] pr-2 text-[var(--tag-red)]"
            : "text-text3 hover:bg-hover hover:text-text"
        }`}
      >
        {listening ? (
          <>
            <span aria-hidden className="inline-block size-2 animate-pulse rounded-full bg-[var(--tag-red)]" />
            <span className="text-xs font-medium">Стоп</span>
          </>
        ) : (
          <span aria-hidden>🎤</span>
        )}
      </button>
      {error && (
        <span role="alert" className="mt-1 block text-xs text-danger">
          {error}
        </span>
      )}
    </>
  );
}

/** Text input or textarea with a dictation button; dictated text is appended. */
export function DictationField({
  value,
  onChange,
  label,
  multiline = false,
  placeholder,
  id,
  name,
  required = false,
  invalid = false,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  multiline?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  invalid?: boolean;
}) {
  const field = {
    id,
    name,
    value,
    placeholder,
    "aria-label": label,
    "aria-required": required || undefined,
    "aria-invalid": invalid || undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };
  const invalidCls = invalid ? " !border-danger" : "";
  const append = (t: string) => onChange(value.trim() ? `${value.trimEnd()} ${t}` : t);
  return (
    <div className="relative">
      {multiline ? (
        <textarea className={`input field-sizing-content min-h-28 py-3 pr-14 text-[15px]${invalidCls}`} {...field} />
      ) : (
        <input className={`input h-12 pr-14 text-[15px]${invalidCls}`} {...field} />
      )}
      <DictateButton label={label} onText={append} multiline={multiline} />
    </div>
  );
}
