export type MutationCoordinator = {
  run<T>(work: () => Promise<T>): Promise<T>;
};

export function createMutationCoordinator(): MutationCoordinator {
  let tail = Promise.resolve();

  return {
    run<T>(work: () => Promise<T>): Promise<T> {
      const next = tail.then(work, work);
      tail = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
  };
}

export function createPassthroughMutationCoordinator(): MutationCoordinator {
  return {
    run<T>(work: () => Promise<T>): Promise<T> {
      return work();
    },
  };
}
