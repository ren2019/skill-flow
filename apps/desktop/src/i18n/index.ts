import { enMessages } from "./en";
import { jaMessages } from "./ja";
import { zhHansMessages } from "./zh";

export type DesktopLanguage = "en" | "ja" | "zh-Hans" | "system";

type MessageKey = keyof typeof enMessages;
type MessageCatalog = Record<MessageKey, string>;
type LocalizedMessageCatalog = Partial<MessageCatalog>;

const messageCatalog = {
  en: enMessages satisfies MessageCatalog,
  ja: jaMessages,
  "zh-Hans": zhHansMessages,
} satisfies {
  en: MessageCatalog;
  ja: LocalizedMessageCatalog;
  "zh-Hans": LocalizedMessageCatalog;
};

type LocalizationOptions = {
  systemLocale?: string;
};

export function normalizeDesktopLanguage(language: string): DesktopLanguage {
  const normalizedTag = language.trim().replaceAll("_", "-").toLowerCase();
  if (
    normalizedTag === "zh"
    || normalizedTag === "zh-hans"
    || normalizedTag.startsWith("zh-hans-")
    || normalizedTag.startsWith("zh-cn")
    || normalizedTag.startsWith("zh-sg")
  ) {
    return "zh-Hans";
  }
  if (normalizedTag === "en" || normalizedTag.startsWith("en-")) {
    return "en";
  }
  if (normalizedTag === "ja" || normalizedTag.startsWith("ja-")) {
    return "ja";
  }
  return "system";
}

export function resolveDesktopLanguage(
  language: string,
  options: LocalizationOptions = {},
): Exclude<DesktopLanguage, "system"> {
  const normalized = normalizeDesktopLanguage(language);
  if (normalized !== "system") {
    return normalized;
  }

  const systemLocale = options.systemLocale ?? readSystemLocale();
  const resolvedSystemLanguage = normalizeDesktopLanguage(systemLocale);
  return resolvedSystemLanguage === "system" ? "en" : resolvedSystemLanguage;
}

export function localize(
  key: MessageKey | string,
  language: string,
  options: LocalizationOptions = {},
): string {
  const resolvedLanguage = resolveDesktopLanguage(language, options);
  const localized = (messageCatalog[resolvedLanguage] as LocalizedMessageCatalog)[key as MessageKey];
  if (localized) {
    return localized;
  }
  return enMessages[key as MessageKey] ?? key;
}

export function localizeRouteKind(routeKind: string, language: string): string {
  return localize(`route.${routeKind}`, language);
}

export function localizePhaseKind(kind: string, language: string): string {
  return localize(`phase.${kind}`, language);
}

export function localizeUpdateStatus(status: string, language: string): string {
  return localize(`update_status.${status}`, language);
}

function readSystemLocale(): string {
  if (typeof navigator !== "undefined" && typeof navigator.language === "string") {
    return navigator.language;
  }

  return Intl.DateTimeFormat().resolvedOptions().locale;
}
