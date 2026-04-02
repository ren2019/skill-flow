import type { ReactNode } from "react";

type GroupCardProps = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  children?: ReactNode;
};

export function GroupCard({ title, subtitle, meta, children }: GroupCardProps) {
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        borderRadius: "18px",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        background: "rgba(255, 255, 255, 0.9)",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{title}</h2>
        {subtitle ? <p style={{ margin: 0, color: "#475569", fontSize: "12px" }}>{subtitle}</p> : null}
        {meta ? <div style={{ fontSize: "12px", color: "#64748b" }}>{meta}</div> : null}
      </header>
      {children ? <section>{children}</section> : null}
    </article>
  );
}
