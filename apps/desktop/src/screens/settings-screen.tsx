import { startTransition, useEffect, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { AgentIcon } from "../components/agent-icon";
import { SettingsSection } from "../components/settings-section";
import { resolveActionIcon } from "../icons/action-icons";
import { localize, localizeUpdateStatus } from "../i18n";
import { detectedAgentRows } from "../runtime/settings-store";
import { SettingsViewModel, type CustomAgentDraft } from "../view-models/settings-view-model";

type SettingsScreenProps = {
  viewModel: SettingsViewModel;
};

export function SettingsScreen({ viewModel }: SettingsScreenProps) {
  const t = (key: string) => localize(key, viewModel.desktopLanguage);
  const rows = detectedAgentRows(viewModel.agentDisplayPreferences, viewModel.customAgents);
  const [editingCustomAgentId, setEditingCustomAgentId] = useState<string | undefined>(undefined);
  const [customAgentDraft, setCustomAgentDraft] = useState<CustomAgentDraft>(() => viewModel.customAgentDraft());
  const [customAgentErrors, setCustomAgentErrors] = useState<Record<string, string>>({});
  const [draggedAgentTargetId, setDraggedAgentTargetId] = useState<string | undefined>(undefined);
  const isEditingCustomAgent = editingCustomAgentId !== undefined;
  const agentTargetIds = rows.map((row) => row.targetId);

  const beginCustomAgentEdit = (agentId?: string) => {
    setEditingCustomAgentId(agentId ?? "");
    setCustomAgentDraft(viewModel.customAgentDraft(agentId));
    setCustomAgentErrors({});
  };
  const cancelCustomAgentEdit = () => {
    setEditingCustomAgentId(undefined);
    setCustomAgentDraft(viewModel.customAgentDraft());
    setCustomAgentErrors({});
  };
  const saveCustomAgent = () => {
    const editingId = editingCustomAgentId || undefined;
    const errors = viewModel.upsertCustomAgent(customAgentDraft, editingId);
    setCustomAgentErrors(errors);
    if (Object.keys(errors).length === 0) {
      cancelCustomAgentEdit();
    }
  };
  const moveAgentToTarget = (sourceTargetId: string, targetTargetId: string) => {
    const fromIndex = agentTargetIds.indexOf(sourceTargetId);
    const toIndex = agentTargetIds.indexOf(targetTargetId);
    viewModel.moveAgents(fromIndex, toIndex, agentTargetIds);
  };
  const beginAgentDrag = (event: DragEvent<HTMLButtonElement>, targetId: string) => {
    setDraggedAgentTargetId(targetId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", targetId);
  };
  const allowAgentDrop = (event: DragEvent<HTMLLIElement>, targetId: string) => {
    if (draggedAgentTargetId && draggedAgentTargetId !== targetId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };
  const dropAgent = (event: DragEvent<HTMLLIElement>, targetId: string) => {
    event.preventDefault();
    const sourceTargetId = event.dataTransfer.getData("text/plain") || draggedAgentTargetId;
    if (sourceTargetId) {
      moveAgentToTarget(sourceTargetId, targetId);
    }
    setDraggedAgentTargetId(undefined);
  };

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
            description={t("settings.row.theme.description")}
            value={viewModel.themeMode}
            options={[
              { value: "light", label: t("settings.option.theme.light") },
              { value: "dark", label: t("settings.option.theme.dark") },
            ]}
            onChange={(value) => {
              viewModel.themeMode = value;
            }}
          />
          <SettingsSelectRow
            title={t("settings.row.accent.title")}
            description={t("settings.row.accent.description")}
            value={viewModel.themeAccent}
            options={[
              { value: "blue", label: t("settings.option.accent.blue") },
              { value: "green", label: t("settings.option.accent.green") },
              { value: "yellow", label: t("settings.option.accent.yellow") },
              { value: "pink", label: t("settings.option.accent.pink") },
              { value: "orange", label: t("settings.option.accent.orange") },
              { value: "purple", label: t("settings.option.accent.purple") },
            ]}
            onChange={(value) => {
              viewModel.themeAccent = value;
            }}
          />
          <SettingsSelectRow
            title={t("settings.row.language.title")}
            description={t("settings.row.language.description")}
            value={viewModel.desktopLanguage}
            options={[
              { value: "system", label: t("settings.option.language.system") },
              { value: "en", label: t("settings.option.language.en") },
              { value: "zh-Hans", label: t("settings.option.language.zh-Hans") },
              { value: "ja", label: t("settings.option.language.ja") },
            ]}
            onChange={(value) => {
              viewModel.desktopLanguage = value;
            }}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.section.menu_bar")}>
          <SettingsSelectRow
            title={t("settings.row.home_card_density.title")}
            description={t("settings.row.home_card_density.description")}
            value={viewModel.homeCardDensity}
            options={[
              { value: "comfortable", label: t("settings.option.card_density.comfortable") },
              { value: "compact", label: t("settings.option.card_density.compact") },
            ]}
            onChange={(value) => {
              viewModel.homeCardDensity = value;
            }}
          />
          <SettingsSelectRow
            title={t("settings.row.menu_card_density.title")}
            description={t("settings.row.menu_card_density.description")}
            value={viewModel.menuCardDensity}
            options={[
              { value: "comfortable", label: t("settings.option.card_density.comfortable") },
              { value: "compact", label: t("settings.option.card_density.compact") },
            ]}
            onChange={(value) => {
              viewModel.menuCardDensity = value;
            }}
          />
        </SettingsSection>

        <SettingsSection
          title={t("settings.section.agent_display")}
          description={t("settings.section.agent_display.description")}
        >
          <div style={actionRowStyle}>
            <button
              type="button"
              data-add-custom-agent="true"
              onClick={() => {
                beginCustomAgentEdit();
              }}
              style={actionButtonStyle()}
            >
              {t("settings.action.add_custom_agent")}
            </button>
          </div>
          {editingCustomAgentId !== undefined ? (
            <CustomAgentEditor
              title={isEditingCustomAgent ? t("settings.edit_custom_agent.title") : t("settings.action.add_custom_agent")}
              draft={customAgentDraft}
              errors={customAgentErrors}
              labels={{
                name: t("settings.custom_agents.name_label"),
                namePlaceholder: t("settings.custom_agents.name_example"),
                globalPath: t("settings.custom_agents.global_path_label"),
                projectPath: t("settings.custom_agents.project_path_label"),
                projectPathHint: t("settings.custom_agents.project_path_hint"),
                cancel: t("settings.action.cancel"),
                save: t("settings.action.save"),
              }}
              onChange={setCustomAgentDraft}
              onCancel={cancelCustomAgentEdit}
              onSave={saveCustomAgent}
            />
          ) : null}
          <ul style={agentListStyle}>
            {rows.map((row) => (
              <li
                key={row.targetId}
                data-view="settings-agent-row"
                data-agent-drop-target-id={row.targetId}
                onDragOver={(event) => allowAgentDrop(event, row.targetId)}
                onDrop={(event) => dropAgent(event, row.targetId)}
                style={{
                  ...agentRowStyle,
                  ...(draggedAgentTargetId === row.targetId ? draggingAgentRowStyle : null),
                }}
              >
                <button
                  type="button"
                  draggable
                  aria-label={`${t("settings.action.drag_agent")} ${row.title}`}
                  title={t("settings.action.drag_agent")}
                  data-agent-drag-handle-target-id={row.targetId}
                  onDragStart={(event) => beginAgentDrag(event, row.targetId)}
                  onDragEnd={() => setDraggedAgentTargetId(undefined)}
                  style={dragHandleButtonStyle}
                >
                  <img src={resolveActionIcon("drag-handle")} alt="" style={dragHandleIconStyle} />
                </button>
                <AgentIcon
                  targetId={row.targetId}
                  shortLabel={row.shortLabel}
                  title={row.title}
                />
                <div style={{ display: "grid", gap: "4px" }}>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{row.title}</strong>
                  <span style={{ color: "#64748b", fontSize: "12px" }}>{row.mountPath}</span>
                </div>
                <button
                  type="button"
                  data-agent-visibility-target-id={row.targetId}
                  onClick={() => {
                    viewModel.setAgentVisibility(row.targetId, !row.isVisible);
                  }}
                  style={actionButtonStyle()}
                >
                  {row.isVisible ? t("settings.enabled") : t("settings.disabled")}
                </button>
                <div style={agentActionStyle}>
                  <button
                    type="button"
                    data-move-agent-up-target-id={row.targetId}
                    disabled={rows.indexOf(row) === 0}
                    onClick={() => {
                      const index = rows.indexOf(row);
                      viewModel.moveAgents(index, Math.max(0, index - 1), rows.map((item) => item.targetId));
                    }}
                    style={agentTextButtonStyle}
                  >
                    {t("settings.action.move_up")}
                  </button>
                  <button
                    type="button"
                    data-move-agent-down-target-id={row.targetId}
                    disabled={rows.indexOf(row) === rows.length - 1}
                    onClick={() => {
                      const index = rows.indexOf(row);
                      viewModel.moveAgents(index, Math.min(rows.length - 1, index + 1), rows.map((item) => item.targetId));
                    }}
                    style={agentTextButtonStyle}
                  >
                    {t("settings.action.move_down")}
                  </button>
                </div>
                {!row.isBuiltIn ? (
                  <div style={agentActionStyle}>
                    <button
                      type="button"
                      data-edit-custom-agent-id={row.targetId}
                      onClick={() => {
                        beginCustomAgentEdit(row.targetId);
                      }}
                      style={agentTextButtonStyle}
                    >
                      {t("settings.action.edit")}
                    </button>
                    <button
                      type="button"
                      data-delete-custom-agent-id={row.targetId}
                      onClick={() => {
                        viewModel.deleteCustomAgent(row.targetId);
                        if (editingCustomAgentId === row.targetId) {
                          cancelCustomAgentEdit();
                        }
                      }}
                      style={agentTextButtonStyle}
                    >
                      {t("settings.action.delete")}
                    </button>
                  </div>
                ) : null}
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
            title={t("settings.row.launch_at_login.title")}
            description={t("settings.row.launch_at_login.description")}
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
            title={t("settings.row.log_level.title")}
            description={t("settings.row.log_level.description")}
            value={viewModel.logLevel}
            options={[
              { value: "debug", label: t("settings.option.log_level.debug") },
              { value: "info", label: t("settings.option.log_level.info") },
              { value: "warn", label: t("settings.option.log_level.warn") },
              { value: "error", label: t("settings.option.log_level.error") },
            ]}
            onChange={(value) => {
              viewModel.logLevel = value;
            }}
          />
          <SettingsToggleRow
            title={t("settings.row.external_helper_override.title")}
            description={t("settings.row.external_helper_override.description")}
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
  description?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

function SettingsSelectRow({ title, description, value, options, onChange }: SettingsSelectRowProps) {
  return (
    <div data-view="settings-control-row" style={controlRowStyle}>
      <SettingsRowCopy title={title} description={description} />
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
  description?: string;
  value: boolean;
  onToggle: () => void;
  enabledLabel: string;
  disabledLabel: string;
};

function SettingsToggleRow({ title, description, value, onToggle, enabledLabel, disabledLabel }: SettingsToggleRowProps) {
  return (
    <div data-view="settings-control-row" style={controlRowStyle}>
      <SettingsRowCopy title={title} description={description} />
      <button type="button" onClick={onToggle} style={actionButtonStyle()}>
        {value ? enabledLabel : disabledLabel}
      </button>
    </div>
  );
}

function CustomAgentEditor({
  title,
  draft,
  errors,
  labels,
  onChange,
  onCancel,
  onSave,
}: {
  title: string;
  draft: CustomAgentDraft;
  errors: Record<string, string>;
  labels: {
    name: string;
    namePlaceholder: string;
    globalPath: string;
    projectPath: string;
    projectPathHint: string;
    cancel: string;
    save: string;
  };
  onChange: (updater: (draft: CustomAgentDraft) => CustomAgentDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <section data-view="settings-custom-agent-editor" style={customAgentEditorStyle}>
      <h3 style={customAgentEditorTitleStyle}>{title}</h3>
      <CustomAgentField
        fieldId="name"
        label={labels.name}
        value={draft.name}
        placeholder={labels.namePlaceholder}
        error={errors.name}
        onChange={(value) => onChange((current) => ({ ...current, name: value }))}
      />
      <CustomAgentField
        fieldId="globalPath"
        label={labels.globalPath}
        value={draft.globalPath}
        placeholder="/Users/name/.my-agent/skills"
        error={errors.globalPath}
        onChange={(value) => onChange((current) => ({ ...current, globalPath: value }))}
      />
      <CustomAgentField
        fieldId="projectPathTemplate"
        label={labels.projectPath}
        value={draft.projectPathTemplate}
        placeholder=".my-agent/skills"
        hint={labels.projectPathHint}
        error={errors.projectPathTemplate}
        onChange={(value) => onChange((current) => ({ ...current, projectPathTemplate: value }))}
      />
      <div style={actionRowStyle}>
        <button type="button" data-cancel-custom-agent="true" onClick={onCancel} style={actionButtonStyle()}>
          {labels.cancel}
        </button>
        <button type="button" data-save-custom-agent="true" onClick={onSave} style={actionButtonStyle()}>
          {labels.save}
        </button>
      </div>
    </section>
  );
}

function CustomAgentField({
  fieldId,
  label,
  value,
  placeholder,
  hint,
  error,
  onChange,
}: {
  fieldId: string;
  label: string;
  value: string;
  placeholder: string;
  hint?: string | undefined;
  error?: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <label style={customAgentFieldStyle}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>{label}</span>
      <input
        data-custom-agent-field={fieldId}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
        style={customAgentInputStyle}
      />
      {hint ? <span style={customAgentHintStyle}>{hint}</span> : null}
      {error ? <span role="alert" style={customAgentErrorStyle}>{error}</span> : null}
    </label>
  );
}

function SettingsRowCopy({ title, description }: { title: string; description?: string | undefined }) {
  return (
    <span style={{ display: "grid", gap: "3px", minWidth: 0 }}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{title}</span>
      {description ? (
        <span style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>{description}</span>
      ) : null}
    </span>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gap: "18px",
  padding: "20px",
  background: "#f2f2f2",
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
  borderRadius: "8px",
  background: "rgba(248, 250, 252, 0.92)",
};

const selectStyle: CSSProperties = {
  height: "32px",
  minWidth: "140px",
  padding: "0 10px",
  borderRadius: "6px",
  border: "none",
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
  gridTemplateColumns: "24px 34px minmax(0, 1fr) auto auto auto",
  gap: "10px",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: "8px",
  background: "rgba(248, 250, 252, 0.92)",
};

const draggingAgentRowStyle: CSSProperties = {
  opacity: 0.62,
  boxShadow: "inset 3px 0 0 rgba(37, 99, 235, 0.72)",
};

const dragHandleButtonStyle: CSSProperties = {
  width: "24px",
  height: "28px",
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "grab",
  display: "grid",
  placeItems: "center",
};

const dragHandleIconStyle: CSSProperties = {
  width: "16px",
  height: "16px",
  opacity: 0.52,
};

const agentActionStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
};

const agentTextButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: 600,
  padding: 0,
};

const customAgentEditorStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  padding: "14px",
  borderRadius: "8px",
  background: "rgba(248, 250, 252, 0.92)",
};

const customAgentEditorTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: 700,
};

const customAgentFieldStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const customAgentInputStyle: CSSProperties = {
  height: "32px",
  padding: "0 10px",
  borderRadius: "6px",
  border: "none",
  background: "rgba(255, 255, 255, 0.94)",
  color: "#0f172a",
  fontSize: "12px",
};

const customAgentHintStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
};

const customAgentErrorStyle: CSSProperties = {
  color: "#b91c1c",
  fontSize: "11px",
};

const updateStatusStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  padding: "14px",
  borderRadius: "8px",
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
    borderRadius: "6px",
    border: "none",
    background: "rgba(255, 255, 255, 0.92)",
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
  };
}
