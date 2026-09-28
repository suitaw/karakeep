import { describe, expect, it } from "vitest";

import { parseSharedText } from "../sharedText";

describe("parseSharedText", () => {
  it("saves a bare URL as a link without a title", () => {
    expect(parseSharedText("  https://example.com/a?b=1  ")).toEqual({
      type: "link",
      url: "https://example.com/a?b=1",
    });
  });

  it("extracts the link and title from a Douyin share", () => {
    const shared =
      "9.74 复制打开抖音，看看【chef~飞的作品】原厂九号M3 95c max闪骑 极速测试#骑… " +
      "https://v.douyin.com/LSQ7w1b0lrA/ a@A.Gi 10/20 :4pm ndn:/";
    expect(parseSharedText(shared)).toEqual({
      type: "link",
      url: "https://v.douyin.com/LSQ7w1b0lrA/",
      title: "【chef~飞的作品】原厂九号M3 95c max闪骑 极速测试#骑…",
    });
  });

  it("stops the URL at CJK punctuation", () => {
    expect(parseSharedText("【标题】看看https://b23.tv/abc，好看")).toEqual({
      type: "link",
      url: "https://b23.tv/abc",
      title: "【标题】看看",
    });
  });

  it("uses the text after the URL when nothing precedes it", () => {
    expect(parseSharedText("https://b23.tv/xyz 【某UP主】视频标题")).toEqual({
      type: "link",
      url: "https://b23.tv/xyz",
      title: "【某UP主】视频标题",
    });
  });

  it("drops trailing sentence punctuation from the URL", () => {
    expect(parseSharedText("see https://example.com/page.")).toEqual({
      type: "link",
      url: "https://example.com/page",
      title: "see",
    });
  });

  it.each(["纯文字笔记，没有链接", "ftp://x.y/z 不是 http", "https:// 坏链接"])(
    "keeps %j as a text note",
    (shared) => {
      expect(parseSharedText(shared)).toEqual({ type: "text", text: shared });
    },
  );
});
