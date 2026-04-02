import { describe, expect, it, vi } from "vitest";
import { createMutationCoordinator, type MutationCoordinator } from "../runtime/mutation-coordinator";
import { HomeViewModel } from "../view-models/home-view-model";
import { ImportViewModel } from "../view-models/import-view-model";
import { DetailViewModel } from "../view-models/detail-view-model";
import { createDesktopAppState } from "../store/desktop-app-state";

describe("desktop mutation coordinator", () => {
  it("queues apply and uninstall style actions serially", async () => {
    const coordinator = createMutationCoordinator();
    const history: string[] = [];
    let releaseFirst = () => undefined;

    const first = coordinator.run(async () => {
      history.push("apply:start");
      await new Promise<void>((resolve) => {
        releaseFirst = () => {
          history.push("apply:end");
          resolve();
        };
      });
    });

    const second = coordinator.run(async () => {
      history.push("uninstall");
    });

    await Promise.resolve();
    expect(history).toEqual(["apply:start"]);

    releaseFirst();
    await Promise.all([first, second]);

    expect(history).toEqual(["apply:start", "apply:end", "uninstall"]);
  });

  it("routes home updates through the shared mutation lane", async () => {
    const run = vi.fn(async <T>(work: () => Promise<T>) => work());
    const state = createDesktopAppState({
      workspace: { sourceIds: ["alpha"] },
    });
    const viewModel = new HomeViewModel(state, {
      updateGroup: vi.fn().mockResolvedValue(undefined),
      mutationCoordinator: { run },
    });

    await viewModel.updateSource("alpha");

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("routes imports through the shared mutation lane", async () => {
    const run = vi.fn(async <T>(work: () => Promise<T>) => work());
    const importer = vi.fn().mockResolvedValue({ sourceId: "starter" });
    const state = createDesktopAppState({
      importState: {
        recommendedGroups: [
          {
            id: "starter",
            title: "Starter",
            locator: "obra/starter",
            previewPhase: { kind: "ready" },
            skills: [{ id: "skill-a", selectedByDefault: true }],
            targets: [{ id: "codex", selectedByDefault: true }],
          },
        ],
      },
    });
    const viewModel = new ImportViewModel(state, {
      importer,
      mutationCoordinator: { run },
    });

    await viewModel.importGroup("starter");

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("routes detail selection mutations through the shared lane", async () => {
    const run = vi.fn(async <T>(work: () => Promise<T>) => work());
    const updateSelection = vi.fn().mockResolvedValue(undefined);
    const state = createDesktopAppState({
      view: {
        currentRoute: { kind: "detail", sourceId: "alpha" },
        selectedSourceId: "alpha",
      },
      detailState: {
        detailsBySourceId: {
          alpha: {
            sourceId: "alpha",
            title: "Alpha",
            enabledTargetLabels: ["Codex"],
            fileTree: [],
            groupDocuments: [],
            targets: [{ id: "codex", label: "Codex", isEnabled: true }],
            skills: [{ id: "skill-a", title: "Skill A", isEnabled: true, documents: [] }],
            sourceFacts: [],
            deploymentFacts: [],
            skillSelection: "full",
            targetSelection: "full",
          },
        },
      },
    });
    const viewModel = new DetailViewModel(state, {
      updateSelection,
      mutationCoordinator: { run },
    });

    await viewModel.toggleTarget("codex");

    expect(run).toHaveBeenCalledTimes(1);
  });
});

export function passthroughMutationCoordinator(): MutationCoordinator {
  return {
    run<T>(work: () => Promise<T>): Promise<T> {
      return work();
    },
  };
}
