import { describe, expect, it } from "vitest";
import { createDesktopAppState } from "../store/desktop-app-state";
import { ImportViewModel } from "../view-models/import-view-model";

describe("import view model", () => {
  it("serializes mutations through one lane", async () => {
    const viewModel = new ImportViewModel(createDesktopAppState());
    const events: string[] = [];

    const first = viewModel.mutationLane.run(async () => {
      events.push("start-a");
      await Promise.resolve();
      events.push("end-a");
    });
    const second = viewModel.mutationLane.run(async () => {
      events.push("start-b");
      events.push("end-b");
    });

    await Promise.all([first, second]);

    expect(events).toEqual(["start-a", "end-a", "start-b", "end-b"]);
  });
});
