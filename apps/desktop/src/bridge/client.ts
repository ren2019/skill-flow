import { invoke } from "@tauri-apps/api/core";
import type { BridgeInvoke } from "./types";

export const invokeBridge: BridgeInvoke = (command, payload) =>
  invoke(command, payload);
