/** "Join" button for a meeting's video call link. */
export function JoinCall({ url, compact = false }: { url: string | null; compact?: boolean }) {
  if (!url) return null;
  const isMeet = url.includes("meet.google.com");
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={compact ? "link text-sm" : "btn btn-primary"}
    >
      📹 {isMeet ? "Приєднатися до Google Meet" : "Приєднатися до дзвінка"}
    </a>
  );
}
