import backIcon from "../assets/ActionIcons/back.svg";
import closeIcon from "../assets/ActionIcons/close.svg";
import deleteIcon from "../assets/ActionIcons/delete.svg";
import dragHandleIcon from "../assets/ActionIcons/drag-handle.svg";
import externalLinkIcon from "../assets/ActionIcons/external-link.svg";
import importIcon from "../assets/ActionIcons/import.svg";
import moreIcon from "../assets/ActionIcons/more.svg";
import pinIcon from "../assets/ActionIcons/pin.svg";
import plusIcon from "../assets/ActionIcons/plus.svg";
import projectIcon from "../assets/ActionIcons/project.svg";
import projectWarningIcon from "../assets/ActionIcons/project-warning.svg";
import searchSubmitEnterIcon from "../assets/ActionIcons/search-submit-enter.svg";
import searchIcon from "../assets/ActionIcons/search.svg";
import settingsIcon from "../assets/ActionIcons/settings.svg";
import tagAddIcon from "../assets/ActionIcons/tag-add.svg";
import tagDeleteIcon from "../assets/ActionIcons/tag-delete.svg";
import updateIcon from "../assets/ActionIcons/update.svg";
import menuIcon from "../assets/MenuBar/menu_icon.svg";

export type ActionIconId =
  | "back"
  | "close"
  | "delete"
  | "drag-handle"
  | "external-link"
  | "import"
  | "more"
  | "pin"
  | "plus"
  | "project"
  | "project-warning"
  | "search"
  | "search-submit-enter"
  | "settings"
  | "tag-add"
  | "tag-delete"
  | "update";

const actionIconMap: Record<ActionIconId, string> = {
  back: backIcon,
  close: closeIcon,
  delete: deleteIcon,
  "drag-handle": dragHandleIcon,
  "external-link": externalLinkIcon,
  import: importIcon,
  more: moreIcon,
  pin: pinIcon,
  plus: plusIcon,
  project: projectIcon,
  "project-warning": projectWarningIcon,
  search: searchIcon,
  "search-submit-enter": searchSubmitEnterIcon,
  settings: settingsIcon,
  "tag-add": tagAddIcon,
  "tag-delete": tagDeleteIcon,
  update: updateIcon,
};

export function resolveActionIcon(iconId: ActionIconId): string {
  return actionIconMap[iconId];
}

export function resolveMenuBarIcon(): string {
  return menuIcon;
}
