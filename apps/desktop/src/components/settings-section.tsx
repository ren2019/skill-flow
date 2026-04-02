import type { ReactNode } from "react";

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section
      data-view="settings-section"
      style={{
        display: "grid",
        gap: "14px",
        padding: "18px",
        borderRadius: "20px",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        background: "rgba(255, 255, 255, 0.88)",
        boxShadow: "0 14px 32px rgba(15, 23, 42, 0.06)",
      }}
    >
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
      <div style={{ display: "grid", gap: "12px" }}>{children}</div>
    </section>
  );
}
