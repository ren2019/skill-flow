import { startTransition, useEffect } from "react";
import { AgentIcon } from "../components/agent-icon";
import { detectedAgentRows } from "../runtime/settings-store";
import { SettingsViewModel } from "../view-models/settings-view-model";

type SettingsScreenProps = {
  viewModel: SettingsViewModel;
};

export function SettingsScreen({ viewModel }: SettingsScreenProps) {
  const rows = detectedAgentRows(viewModel.agentDisplayPreferences);

  useEffect(() => {
    startTransition(() => {
      void viewModel.checkForUpdatesIfNeeded();
    });
  }, [viewModel]);

  return (
    <main>
      <h1>Settings</h1>
      <section>
        <h2>General</h2>
        <dl>
          <div>
            <dt>Auto Launch</dt>
            <dd>{viewModel.autoLaunch ? "Enabled" : "Disabled"}</dd>
          </div>
          <div>
            <dt>Log Level</dt>
            <dd>{viewModel.logLevel}</dd>
          </div>
          <div>
            <dt>Current Version</dt>
            <dd>{viewModel.currentVersion}</dd>
          </div>
          <div>
            <dt>Update Status</dt>
            <dd>{viewModel.updateStatus}</dd>
          </div>
          {viewModel.latestVersion ? (
            <div>
              <dt>Latest Version</dt>
              <dd>{viewModel.latestVersion}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      <section>
        <h2>Agent Mount Paths</h2>
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
