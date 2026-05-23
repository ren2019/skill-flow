import type { ReactNode } from "react";

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section
      data-view="settings-section"
      style={{
        display: "grid",
        gap: "12px",
        padding: "16px",
        borderRadius: "8px",
        background: "rgba(255, 255, 255, 0.92)",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
      }}
    >
      <header style={{ display: "grid", gap: "4px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#475569",
          }}
        >
          {title}
        </h2>
        {description ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "12px", lineHeight: 1.45 }}>
            {description}
          </p>
        ) : null}
      </header>
      <div style={{ display: "grid", gap: "12px" }}>{children}</div>
    </section>
  );
}
