import backIcon from "../assets/ActionIcons/back.svg";
import closeIcon from "../assets/ActionIcons/close.svg";
import dragHandleIcon from "../assets/ActionIcons/drag-handle.svg";
import importIcon from "../assets/ActionIcons/import.svg";
import moreIcon from "../assets/ActionIcons/more.svg";
import pinIcon from "../assets/ActionIcons/pin.svg";
import projectIcon from "../assets/ActionIcons/project.svg";
import projectWarningIcon from "../assets/ActionIcons/project-warning.svg";
import searchIcon from "../assets/ActionIcons/search.svg";
import settingsIcon from "../assets/ActionIcons/settings.svg";
import updateIcon from "../assets/ActionIcons/update.svg";
import menuIcon from "../assets/MenuBar/menu_icon.svg";

export type ActionIconId =
  | "back"
  | "close"
  | "drag-handle"
  | "import"
  | "more"
  | "pin"
  | "project"
  | "project-warning"
  | "search"
  | "settings"
  | "update";

const actionIconMap: Record<ActionIconId, string> = {
  back: backIcon,
  close: closeIcon,
  "drag-handle": dragHandleIcon,
  import: importIcon,
  more: moreIcon,
  pin: pinIcon,
  project: projectIcon,
  "project-warning": projectWarningIcon,
  search: searchIcon,
  settings: settingsIcon,
  update: updateIcon,
};

export function resolveActionIcon(iconId: ActionIconId): string {
  return actionIconMap[iconId];
}

export function resolveMenuBarIcon(): string {
  return menuIcon;
}
