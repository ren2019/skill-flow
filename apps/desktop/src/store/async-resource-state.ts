export type ResourcePhase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "failed"; message: string };

export type AsyncResourceState = {
  homeBootstrapPhase: ResourcePhase;
};

export function createAsyncResourceState(
  seed: Partial<AsyncResourceState> = {},
): AsyncResourceState {
  return {
    homeBootstrapPhase: seed.homeBootstrapPhase ?? { kind: "idle" },
  };
}
