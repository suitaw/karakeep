import { MAX_BOOKMARK_TITLE_LENGTH } from "@karakeep/shared/types/bookmarks";

export type SharedTextBookmark =
  | { type: "link"; url: string; title?: string }
  | { type: "text"; text: string };

// Stops at whitespace and CJK punctuation so "看看https://x.y/a，好" works.
const URL_RE = /https?:\/\/[^\s<>"'，。！？、；：（）【】「」《》]+/i;
// ASCII punctuation that usually ends a sentence rather than the URL.
const TRAILING_PUNCT_RE = /[.,;:!?)\]}'"]+$/;
// Share-sheet boilerplate such as "9.74 复制打开抖音，看看".
const SHARE_PREFIX_RE = /^[\d.]*\s*复制打开\S+?[，,]\s*(看看)?/;

function toHttpUrl(candidate: string): string | undefined {
  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // not a URL
  }
  return undefined;
}

/**
 * Decide how to save text shared into the app. Apps like Douyin, Bilibili or
 * Xiaohongshu share "<title> <url> <junk>" instead of a bare URL; saving that
 * as a text note loses the link preview, so the first http(s) URL becomes a
 * link bookmark and the text before it (or after, if nothing precedes it)
 * becomes the title.
 */
export function parseSharedText(raw: string): SharedTextBookmark {
  const text = raw.trim();

  const whole = toHttpUrl(text);
  if (whole && !/\s/.test(text)) {
    return { type: "link", url: whole };
  }

  const match = URL_RE.exec(text);
  const url = match
    ? toHttpUrl(match[0].replace(TRAILING_PUNCT_RE, ""))
    : undefined;
  if (!match || !url) {
    return { type: "text", text };
  }

  const clean = (s: string) =>
    s.replace(SHARE_PREFIX_RE, "").replace(/\s+/g, " ").trim();
  const title =
    clean(text.slice(0, match.index)) ||
    clean(text.slice(match.index + match[0].length));

  return title
    ? { type: "link", url, title: title.slice(0, MAX_BOOKMARK_TITLE_LENGTH) }
    : { type: "link", url };
}
