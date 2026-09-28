// Minimal Intl.PluralRules for Hermes on Android, which doesn't implement it.
// Without it i18next falls back to the legacy v3 suffixes (`_plural`) and
// every `_one`/`_other` key renders as the raw key. Only the languages in
// SUPPORTED_LANGUAGES are covered; anything else uses the English rules.

type Category = "one" | "few" | "many" | "other";

interface Rule {
  categories: Category[];
  select: (n: number) => Category;
}

const RULES: Record<string, Rule> = {
  en: {
    categories: ["one", "other"],
    select: (n) => (n === 1 ? "one" : "other"),
  },
  pl: {
    categories: ["one", "few", "many", "other"],
    select: (n) => {
      if (!Number.isInteger(n)) return "other";
      if (n === 1) return "one";
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return "few";
      }
      return "many";
    },
  },
  zh: {
    categories: ["other"],
    select: () => "other",
  },
};

export class PluralRulesShim {
  private readonly lang: string;

  constructor(locale?: string | string[]) {
    const tag = (Array.isArray(locale) ? locale[0] : locale) ?? "en";
    const base = tag.split(/[-_]/)[0].toLowerCase();
    this.lang = base in RULES ? base : "en";
  }

  select(n: number): Category {
    return RULES[this.lang].select(Math.abs(Number(n)));
  }

  resolvedOptions() {
    return {
      locale: this.lang,
      type: "cardinal" as const,
      pluralCategories: [...RULES[this.lang].categories],
    };
  }

  static supportedLocalesOf(locales: string | string[]): string[] {
    return Array.isArray(locales) ? locales : [locales];
  }
}

export function installPluralRulesIfMissing(): void {
  const g = globalThis as unknown as { Intl?: Record<string, unknown> };
  g.Intl ??= {};
  if (typeof g.Intl.PluralRules !== "function") {
    g.Intl.PluralRules = PluralRulesShim;
  }
}
