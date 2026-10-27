/** Returns an iframe-embeddable URL for common doc hosts, or null. */
export function embedUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const g = u.pathname.match(/^\/(presentation|spreadsheets|document)\/d\/([^/]+)/);
  if (host === "docs.google.com" && g) {
    const [, type, id] = g;
    return type === "presentation"
      ? `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`
      : `https://docs.google.com/${type}/d/${id}/preview`;
  }
  const f = u.pathname.match(/^\/file\/d\/([^/]+)/);
  if (host === "drive.google.com" && f) return `https://drive.google.com/file/d/${f[1]}/preview`;
  if (host === "figma.com") return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
  if (host === "canva.com" && u.pathname.startsWith("/design/")) {
    return `https://www.canva.com${u.pathname.replace(/\/(edit|view)$/, "")}/view?embed`;
  }
  if (host === "pitch.com" && u.pathname.startsWith("/v/")) return `https://pitch.com/embed${u.pathname.slice(2)}`;
  return null;
}
