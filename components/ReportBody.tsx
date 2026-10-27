export function ReportBody({ done, next, blockers }: { done: string; next: string; blockers: string }) {
  return (
    <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-0.5">
      <dt className="text-text2">Зроблено</dt>
      <dd className="whitespace-pre-line">{done}</dd>
      <dt className="text-text2">Далі</dt>
      <dd className="whitespace-pre-line">{next}</dd>
      {blockers && (
        <>
          <dt className="text-danger">Блокери</dt>
          <dd className="whitespace-pre-line text-danger">{blockers}</dd>
        </>
      )}
    </dl>
  );
}
