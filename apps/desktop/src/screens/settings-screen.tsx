import { startTransition, useEffect, type CSSProperties, type ReactNode } from "react";
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
  const rows = detectedAgentRows(viewModel.agentDisplayPreferences, viewModel.customAgents);

  useEffect(() => {
    startTransition(() => {
      void viewModel.checkForUpdatesIfNeeded();
    });
  }, [viewModel]);

  return (
    <main data-view="settings-page" style={pageStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>{t("route.settings")}</p>
        <h1 style={headingStyle}>{t("page.settings.title")}</h1>
      </header>

      <div style={gridStyle}>
        <SettingsSection title={t("settings.section.appearance")}>
          <SettingsSelectRow
            title={t("settings.row.theme.title")}
            value={viewModel.themeMode}
            options={[
              { value: "light", label: "light" },
              { value: "dark", label: "dark" },
            ]}
            onChange={(value) => {
              viewModel.themeMode = value;
            }}
          />
          <SettingsSelectRow
            title={t("settings.row.accent.title")}
            value={viewModel.themeAccent}
            options={[
              { value: "blue", label: "blue" },
              { value: "green", label: "green" },
              { value: "orange", label: "orange" },
              { value: "amber", label: "amber" },
            ]}
            onChange={(value) => {
              viewModel.themeAccent = value;
            }}
          />
          <SettingsSelectRow
            title={t("settings.row.language.title")}
            value={viewModel.desktopLanguage}
            options={[
              { value: "system", label: "system" },
              { value: "en", label: "en" },
              { value: "zh-Hans", label: "zh-Hans" },
              { value: "ja", label: "ja" },
            ]}
            onChange={(value) => {
              viewModel.desktopLanguage = value;
            }}
          />
          <SettingsSelectRow
            title={t("settings.row.home_card_density.title")}
            value={viewModel.homeCardDensity}
            options={[
              { value: "comfortable", label: "comfortable" },
              { value: "compact", label: "compact" },
            ]}
            onChange={(value) => {
              viewModel.homeCardDensity = value;
            }}
          />
          <SettingsSelectRow
            title={t("settings.row.menu_card_density.title")}
            value={viewModel.menuCardDensity}
            options={[
              { value: "compact", label: "compact" },
              { value: "comfortable", label: "comfortable" },
            ]}
            onChange={(value) => {
              viewModel.menuCardDensity = value;
            }}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.section.agent_display")}>
          <ul style={agentListStyle}>
            {rows.map((row) => (
              <li key={row.targetId} data-view="settings-agent-row" style={agentRowStyle}>
                <AgentIcon
                  targetId={row.targetId}
                  shortLabel={row.shortLabel}
                  title={row.title}
                />
                <div style={{ display: "grid", gap: "4px" }}>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{row.title}</strong>
                  <span style={{ color: "#64748b", fontSize: "12px" }}>{row.mountPath}</span>
                </div>
              </li>
            ))}
          </ul>
        </SettingsSection>

        <SettingsSection title={t("settings.section.application_update")}>
          <SettingsControlRow title={t("settings.current_version")} value={viewModel.currentVersion} />
          <div data-view="settings-update-status" style={updateStatusStyle}>
            <span style={statusLabelStyle}>{t("settings.update_status")}</span>
            <strong>{localizeUpdateStatus(viewModel.updateStatus, viewModel.desktopLanguage)}</strong>
            {viewModel.latestVersion ? (
              <span style={{ color: "#64748b", fontSize: "12px" }}>
                {t("settings.latest_version")}: {viewModel.latestVersion}
              </span>
            ) : null}
          </div>
          <div data-view="settings-action-row" style={actionRowStyle}>
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  void viewModel.checkForUpdates();
                });
              }}
              style={actionButtonStyle()}
            >
              {t("settings.action.check_updates")}
            </button>
            <button type="button" onClick={() => viewModel.openReleasePage()} style={actionButtonStyle()}>
              {t("settings.action.open_releases")}
            </button>
          </div>
        </SettingsSection>

        <SettingsSection title={t("settings.section.general")}>
          <SettingsToggleRow
            title={t("settings.auto_launch")}
            value={viewModel.autoLaunch}
            onToggle={() => {
              viewModel.autoLaunch = !viewModel.autoLaunch;
            }}
            enabledLabel={t("settings.enabled")}
            disabledLabel={t("settings.disabled")}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.section.advanced")}>
          <SettingsSelectRow
            title={t("settings.log_level")}
            value={viewModel.logLevel}
            options={[
              { value: "info", label: "info" },
              { value: "warn", label: "warn" },
              { value: "error", label: "error" },
              { value: "debug", label: "debug" },
            ]}
            onChange={(value) => {
              viewModel.logLevel = value;
            }}
          />
          <SettingsToggleRow
            title={t("settings.row.external_helper_override.title")}
            value={viewModel.externalHelperOverride}
            onToggle={() => {
              viewModel.externalHelperOverride = !viewModel.externalHelperOverride;
            }}
            enabledLabel={t("settings.enabled")}
            disabledLabel={t("settings.disabled")}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.section.maintenance")}>
          <div data-view="settings-action-row" style={actionRowStyle}>
            <button
              type="button"
              onClick={() => {
                void viewModel.clearMetadataCache();
              }}
              style={actionButtonStyle()}
            >
              {t("settings.action.clear_cache")}
            </button>
            <button type="button" onClick={() => viewModel.resetConfiguration()} style={actionButtonStyle()}>
              {t("settings.action.reset_configuration")}
            </button>
          </div>
        </SettingsSection>
      </div>
    </main>
  );
}

type SettingsControlRowProps = {
  title: string;
  value: ReactNode;
};

function SettingsControlRow({ title, value }: SettingsControlRowProps) {
  return (
    <div data-view="settings-control-row" style={controlRowStyle}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{title}</span>
      <span style={{ fontSize: "12px", color: "#475569" }}>{value}</span>
    </div>
  );
}

type SettingsSelectRowProps = {
  title: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

function SettingsSelectRow({ title, value, options, onChange }: SettingsSelectRowProps) {
  return (
    <div data-view="settings-control-row" style={controlRowStyle}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{title}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={selectStyle}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type SettingsToggleRowProps = {
  title: string;
  value: boolean;
  onToggle: () => void;
  enabledLabel: string;
  disabledLabel: string;
};

function SettingsToggleRow({ title, value, onToggle, enabledLabel, disabledLabel }: SettingsToggleRowProps) {
  return (
    <div data-view="settings-control-row" style={controlRowStyle}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{title}</span>
      <button type="button" onClick={onToggle} style={actionButtonStyle()}>
        {value ? enabledLabel : disabledLabel}
      </button>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gap: "18px",
  padding: "20px",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
};

const headerStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#475569",
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#0f172a",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  alignItems: "start",
};

const controlRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(248, 250, 252, 0.92)",
};

const selectStyle: CSSProperties = {
  height: "32px",
  minWidth: "140px",
  padding: "0 10px",
  borderRadius: "10px",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  background: "rgba(255, 255, 255, 0.92)",
  color: "#0f172a",
  fontSize: "12px",
};

const agentListStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: "10px",
};

const agentRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr)",
  gap: "10px",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(248, 250, 252, 0.92)",
};

const updateStatusStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  padding: "14px",
  borderRadius: "16px",
  background: "rgba(248, 250, 252, 0.92)",
};

const statusLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

function actionButtonStyle(): CSSProperties {
  return {
    height: "36px",
    padding: "0 12px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(255, 255, 255, 0.92)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
  };
}
