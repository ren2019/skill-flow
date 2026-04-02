import { startTransition, useEffect } from "react";
import { AgentIcon } from "../components/agent-icon";
import { localize, localizeUpdateStatus } from "../i18n";
import { detectedAgentRows } from "../runtime/settings-store";
import { SettingsViewModel } from "../view-models/settings-view-model";

type SettingsScreenProps = {
  viewModel: SettingsViewModel;
};

export function SettingsScreen({ viewModel }: SettingsScreenProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const rows = detectedAgentRows(viewModel.agentDisplayPreferences);

  useEffect(() => {
    startTransition(() => {
      void viewModel.checkForUpdatesIfNeeded();
    });
  }, [viewModel]);

  return (
    <main>
      <h1>{t("page.settings.title")}</h1>
      <section>
        <h2>{t("page.settings.general")}</h2>
        <dl>
          <div>
            <dt>{t("settings.auto_launch")}</dt>
            <dd>{viewModel.autoLaunch ? t("settings.enabled") : t("settings.disabled")}</dd>
          </div>
          <div>
            <dt>{t("settings.log_level")}</dt>
            <dd>{viewModel.logLevel}</dd>
          </div>
          <div>
            <dt>{t("settings.current_version")}</dt>
            <dd>{viewModel.currentVersion}</dd>
          </div>
          <div>
            <dt>{t("settings.update_status")}</dt>
            <dd>{localizeUpdateStatus(viewModel.updateStatus, viewModel.desktopLanguage)}</dd>
          </div>
          {viewModel.latestVersion ? (
            <div>
              <dt>{t("settings.latest_version")}</dt>
              <dd>{viewModel.latestVersion}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      <section>
        <h2>{t("page.settings.agent_mount_paths")}</h2>
        <ul>
          {rows.map((row) => (
            <li key={row.targetId}>
              <AgentIcon
                targetId={row.targetId}
                shortLabel={row.shortLabel}
                title={row.title}
              />{" "}
              <strong>{row.title}</strong> <span>{row.mountPath}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
