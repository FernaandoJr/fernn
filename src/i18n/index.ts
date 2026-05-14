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

export const resolveLocale = (
  locale?: string | null,
): (typeof supportedLngs)[number] => {
  if (!locale) return defaultLocale;
  const normalized = locale.trim().toLowerCase();
  const exact = supportedLngs.find((l) => l.toLowerCase() === normalized);
  if (exact) return exact;
  const lang = normalized.split("-")[0];
  return supportedLngs.find((l) => l.toLowerCase().split("-")[0] === lang) ?? defaultLocale;
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
