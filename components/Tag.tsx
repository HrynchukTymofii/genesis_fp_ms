import type { ReactNode } from "react";

export function Tag({ color = "gray", children, title }: { color?: string; children: ReactNode; title?: string }) {
  return (
    <span className={`tag tag-${color}`} title={title}>
      {children}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full dot-${color}`} />;
}

export function PropertyRow({ label, icon, children }: { label: string; icon?: string; children: ReactNode }) {
  return (
    <div className="prop">
      <div className="prop-label">
        {icon && <span aria-hidden className="w-4 text-center">{icon}</span>}
        {label}
      </div>
      <div className="prop-value">{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-2 text-text3">{children}</p>;
}
