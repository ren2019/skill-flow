import type { ReactNode } from "react";

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section data-view="settings-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
