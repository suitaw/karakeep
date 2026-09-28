import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";

import enMobile from "../locales/en.json";
import plMobile from "../locales/pl.json";
import zhMobile from "../locales/zh.json";
import {
  installPluralRulesIfMissing,
  PluralRulesShim,
} from "../plural-rules";

const samples = [...Array.from({ length: 201 }, (_, i) => i), 1.5, 2.5, 22.5];

describe("PluralRulesShim", () => {
  it.each(["en", "pl", "zh"])("matches native rules for %s", (lang) => {
    const native = new Intl.PluralRules(lang);
    const shim = new PluralRulesShim(lang);
    for (const n of samples) {
      expect(shim.select(n), `${lang} ${n}`).toBe(native.select(n));
    }
    const produced = new Set(samples.map((n) => native.select(n)));
    expect(new Set(shim.resolvedOptions().pluralCategories)).toEqual(produced);
  });

  it("maps regional tags to their base language", () => {
    expect(new PluralRulesShim("pl-PL").select(3)).toBe("few");
    expect(new PluralRulesShim("zh-CN").select(1)).toBe("other");
  });
});

describe("i18next without native Intl.PluralRules (Hermes on Android)", () => {
  const nativePluralRules = Intl.PluralRules;

  afterEach(() => {
    Reflect.set(Intl, "PluralRules", nativePluralRules);
  });

  it("resolves plural keys once the shim is installed", async () => {
    // Simulate an engine without Intl.PluralRules.
    Reflect.deleteProperty(Intl, "PluralRules");
    installPluralRulesIfMissing();
    expect(Intl.PluralRules).toBe(PluralRulesShim);

    const instance = i18next.createInstance();
    await instance.init({
      resources: {
        en: { mobile: enMobile },
        pl: { mobile: plMobile },
        zh: { mobile: zhMobile },
      },
      lng: "en",
      ns: ["mobile"],
      defaultNS: "mobile",
    });

    const t = (lng: string) => instance.getFixedT(lng, "mobile");
    expect(t("en")("tags_tab.bookmarks", { count: 5 })).toBe("bookmarks");
    expect(t("pl")("stats.item", { count: 3 })).toBe("elementy");
    expect(t("zh")("emoji.results", { count: 5 })).toBe("5 个结果");
  });

  it("leaves a native implementation alone", () => {
    installPluralRulesIfMissing();
    expect(Intl.PluralRules).toBe(nativePluralRules);
  });
});
