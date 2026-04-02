import { enMessages } from "./en";
import { zhHansMessages } from "./zh";

export type DesktopLanguage = "en" | "zh-Hans" | "system";

type MessageKey = keyof typeof enMessages;
type MessageCatalog = Record<MessageKey, string>;
type LocalizedMessageCatalog = Partial<MessageCatalog>;

const messageCatalog = {
  en: enMessages satisfies MessageCatalog,
  "zh-Hans": zhHansMessages,
} satisfies {
  en: MessageCatalog;
  "zh-Hans": LocalizedMessageCatalog;
};

export function normalizeDesktopLanguage(language: string): DesktopLanguage {
  if (language === "zh" || language === "zh-Hans") {
    return "zh-Hans";
  }
  if (language === "en") {
    return "en";
  }
  return "system";
}

export function resolveDesktopLanguage(language: string): Exclude<DesktopLanguage, "system"> {
  const normalized = normalizeDesktopLanguage(language);
  return normalized === "system" ? "en" : normalized;
}

export function localize(key: MessageKey | string, language: string): string {
  const resolvedLanguage = resolveDesktopLanguage(language);
  const localized = (messageCatalog[resolvedLanguage] as LocalizedMessageCatalog)[key as MessageKey];
  if (localized) {
    return localized;
  }
  return enMessages[key as MessageKey] ?? key;
}
