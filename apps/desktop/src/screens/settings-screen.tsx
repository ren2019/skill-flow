import { startTransition, useEffect } from "react";
import { AgentIcon } from "../components/agent-icon";
import { SettingsSection } from "../components/settings-section";
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
      <SettingsSection title={t("settings.section.appearance")}>
        <p>{t("settings.row.theme.title")}: {viewModel.themeMode}</p>
        <p>{t("settings.row.accent.title")}: {viewModel.themeAccent}</p>
        <p>{t("settings.row.language.title")}: {viewModel.desktopLanguage}</p>
      </SettingsSection>
      <SettingsSection title={t("settings.section.agent_display")}>
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
      </SettingsSection>
      <SettingsSection title={t("settings.section.application_update")}>
        <p>{t("settings.current_version")}: {viewModel.currentVersion}</p>
        <p>{t("settings.update_status")}: {localizeUpdateStatus(viewModel.updateStatus, viewModel.desktopLanguage)}</p>
        {viewModel.latestVersion ? <p>{t("settings.latest_version")}: {viewModel.latestVersion}</p> : null}
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              void viewModel.checkForUpdates();
            });
          }}
        >
          {t("settings.action.check_updates")}
        </button>
        <button type="button" onClick={() => viewModel.openReleasePage()}>
          {t("settings.action.open_releases")}
        </button>
      </SettingsSection>
      <SettingsSection title={t("settings.section.general")}>
        <p>{t("settings.auto_launch")}: {viewModel.autoLaunch ? t("settings.enabled") : t("settings.disabled")}</p>
      </SettingsSection>
      <SettingsSection title={t("settings.section.advanced")}>
        <p>{t("settings.log_level")}: {viewModel.logLevel}</p>
        <p>{t("settings.row.external_helper_override.title")}: {viewModel.externalHelperOverride ? t("settings.enabled") : t("settings.disabled")}</p>
      </SettingsSection>
      <SettingsSection title={t("settings.section.maintenance")}>
        <button type="button" onClick={() => viewModel.clearMetadataCache()}>
          {t("settings.action.clear_cache")}
        </button>
        <button type="button" onClick={() => viewModel.resetConfiguration()}>
          {t("settings.action.reset_configuration")}
        </button>
      </SettingsSection>
    </main>
  );
}
