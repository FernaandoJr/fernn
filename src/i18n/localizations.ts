import { Locale } from "discord.js";

import esCommon from "./locales/es/common.json";
import ptBrCommon from "./locales/pt-BR/common.json";

type CommonKey = keyof typeof esCommon;

export function nameLocalizations(key: CommonKey): Partial<Record<Locale, string>> {
  return {
    [Locale.SpanishES]: esCommon[key] as string,
    [Locale.PortugueseBR]: ptBrCommon[key] as string,
  };
}
