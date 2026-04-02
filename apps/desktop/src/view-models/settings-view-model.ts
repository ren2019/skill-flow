import type { DesktopAppState } from "../store/desktop-app-state";

export class SettingsViewModel {
  constructor(private readonly state: DesktopAppState) {}

  get autoLaunch(): boolean {
    return this.state.settings.autoLaunch;
  }

  set autoLaunch(value: boolean) {
    this.state.settings.autoLaunch = value;
  }

  get logLevel(): string {
    return this.state.settings.logLevel;
  }

  set logLevel(value: string) {
    this.state.settings.logLevel = value;
  }
}
