import i18next from "i18next";

import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";
import ptBrCommon from "./locales/pt-BR/common.json";

const defaultLocale = "en";
const defaultNamespace = "common";

const resources = {
  en: {
    common: enCommon,
  },
  es: {
    common: esCommon,
  },
  "pt-BR": {
    common: ptBrCommon,
  },
} as const;

const supportedLngs = Object.keys(resources) as Array<keyof typeof resources>;
const supportedLocaleSet = new Set<string>(supportedLngs);

const normalizeLocale = (locale?: string | null): string | undefined => {
  if (!locale) {
    return undefined;
  }

  return locale.trim().toLowerCase();
};

export const resolveLocale = (
  locale?: string | null,
): (typeof supportedLngs)[number] => {
  const normalizedLocale = normalizeLocale(locale);
  const matchedLocale = supportedLngs.find(
    (supportedLocale) => supportedLocale.toLowerCase() === normalizedLocale,
  );

  if (matchedLocale) {
    return matchedLocale;
  }

  const languageOnlyLocale = normalizedLocale?.split("-")[0];
  const matchedLanguage = supportedLngs.find(
    (supportedLocale) => supportedLocale.toLowerCase().split("-")[0] === languageOnlyLocale,
  );

  if (matchedLanguage) {
    return matchedLanguage;
  }

  return defaultLocale;
};

let initPromise: Promise<void> | undefined;

export const initializeI18n = (): Promise<void> => {
  initPromise ??= i18next.init({
    resources,
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    supportedLngs,
    ns: [defaultNamespace],
    defaultNS: defaultNamespace,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  }).then(() => undefined);

  return initPromise;
};

export const getTranslator = (locale?: string | null) =>
  i18next.getFixedT(resolveLocale(locale), defaultNamespace);
