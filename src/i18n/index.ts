import { Locale } from "discord.js";
import i18next from "i18next";

import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";
import ptBrCommon from "./locales/pt-BR/common.json";

const defaultLocale = Locale.EnglishUS;
const defaultNamespace = "common";

const resources = {
  [Locale.EnglishUS]: { common: enCommon },
  [Locale.SpanishES]: { common: esCommon },
  [Locale.PortugueseBR]: { common: ptBrCommon },
} as const;

const supportedLocales = new Set(Object.keys(resources));

export const resolveLocale = (locale?: string | null): string =>
  locale && supportedLocales.has(locale) ? locale : defaultLocale;

let initPromise: Promise<void> | undefined;

export const initializeI18n = (): Promise<void> => {
  initPromise ??= i18next
    .init({
      resources,
      lng: defaultLocale,
      fallbackLng: defaultLocale,
      supportedLngs: [...supportedLocales],
      ns: [defaultNamespace],
      defaultNS: defaultNamespace,
      interpolation: { escapeValue: false },
      returnNull: false,
    })
    .then(() => undefined);

  return initPromise;
};

export const getTranslator = (locale?: string | null) =>
  i18next.getFixedT(resolveLocale(locale), defaultNamespace);
