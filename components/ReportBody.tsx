import type { ReportLink } from "@/db/schema";
import { domainOf, Favicon } from "@/components/LinkList";

export function ReportBody({
  done,
  next,
  blockers,
  links = [],
}: {
  done: string;
  next: string;
  blockers: string;
  links?: ReportLink[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
        <dt className="text-text2">✅ Зроблено</dt>
        <dd className="whitespace-pre-line">{done}</dd>
        <dt className="text-text2">➡️ Далі</dt>
        <dd className="whitespace-pre-line">{next}</dd>
        {blockers && (
          <>
            <dt className="text-danger">🚧 Блокери</dt>
            <dd className="whitespace-pre-line rounded bg-[var(--tag-red-bg)] px-2 py-0.5 text-[var(--tag-red)]">{blockers}</dd>
          </>
        )}
      </dl>
      {links.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Матеріали">
          {links.map((l) => (
            <li key={l.url} className="min-w-0 max-w-full">
              <a href={l.url} target="_blank" rel="noreferrer" className="pill max-w-full">
                {l.kind === "file" ? <span aria-hidden>📎</span> : <Favicon url={l.url} size={14} />}
                <span className="truncate text-text">{l.title || domainOf(l.url)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
