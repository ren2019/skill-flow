import type { DesktopAppState } from "../store/desktop-app-state";
import type { ImportDraftState } from "../store/import-state";
import type { DesktopRoute } from "../navigation/desktop-route";

export class SerializedMutationLane {
  private tail: Promise<void> = Promise.resolve();

  run<T>(operation: () => Promise<T> | T): Promise<T> {
    const next = this.tail.then(() => operation());
    this.tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

export class ImportViewModel {
  readonly mutationLane = new SerializedMutationLane();

  constructor(private readonly state: DesktopAppState) {}

  get currentRoute(): DesktopRoute {
    return this.state.view.currentRoute;
  }

  get draftsByItemId(): Record<string, ImportDraftState> {
    return this.state.importState.draftsByItemId;
  }
}
