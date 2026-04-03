import { DesktopNavigator } from "../navigation/desktop-navigator";
import {
  createDesktopAppState,
  type DesktopAppState,
} from "../store/desktop-app-state";

type DesktopRuntimeDependencies = {
  bootstrap: () => Promise<string[]> | string[];
};

export class DesktopRuntime {
  readonly state: DesktopAppState;
  private readonly navigator: DesktopNavigator;
  private bootstrapTask: Promise<void> | undefined;

  constructor(
    private readonly dependencies: DesktopRuntimeDependencies,
    state: DesktopAppState = createDesktopAppState(),
  ) {
    this.state = state;
    this.navigator = new DesktopNavigator(this.state);
  }

  async bootstrapIfNeeded(): Promise<void> {
    const phase = this.state.asyncResources.homeBootstrapPhase.kind;
    if (phase === "ready" || phase === "loading") {
      return;
    }

    this.state.asyncResources.homeBootstrapPhase = { kind: "loading" };
    this.bootstrapTask = (async () => {
      try {
        const sourceIds = await this.dependencies.bootstrap();
        this.state.workspace.sourceIds = [...sourceIds];
        if (!this.state.view.selectedSourceId && sourceIds.length > 0) {
          this.state.view.selectedSourceId = sourceIds[0];
        }
        this.state.asyncResources.homeBootstrapPhase = { kind: "ready" };
      } catch (error) {
        this.state.asyncResources.homeBootstrapPhase = {
          kind: "failed",
          message: error instanceof Error ? error.message : "Unable to bootstrap desktop runtime.",
        };
      } finally {
        this.bootstrapTask = undefined;
      }
    })();

    await this.bootstrapTask;
  }

  showDetail(sourceId: string): void {
    this.navigator.showDetail(sourceId);
  }
}
