import { describe, it, expect } from "vitest";
import { splitByEmojis, emojifyHtml } from "./emoji";
import { CustomEmoji } from "../types";

const blobcat: CustomEmoji = {
  shortcode: "blobcat",
  url: "https://example.com/emoji/blobcat.png",
  static_url: "https://example.com/emoji/blobcat_static.png",
  visible_in_picker: true,
};

const partyParrot: CustomEmoji = {
  shortcode: "party_parrot",
  url: "https://example.com/emoji/party_parrot.gif",
  static_url: "https://example.com/emoji/party_parrot.png",
  visible_in_picker: true,
};

describe("splitByEmojis", () => {
  it("splits text into text and emoji segments", () => {
    expect(splitByEmojis("hello :blobcat: world", [blobcat])).toEqual([
      { type: "text", text: "hello " },
      { type: "emoji", emoji: blobcat },
      { type: "text", text: " world" },
    ]);
  });

  it("handles adjacent emojis", () => {
    expect(
      splitByEmojis(":blobcat::party_parrot:", [blobcat, partyParrot])
    ).toEqual([
      { type: "emoji", emoji: blobcat },
      { type: "emoji", emoji: partyParrot },
    ]);
  });

  it("leaves unknown shortcodes as text", () => {
    expect(splitByEmojis("a :unknown: b", [blobcat])).toEqual([
      { type: "text", text: "a :unknown: b" },
    ]);
  });

  it("returns the text as-is when there are no emojis", () => {
    expect(splitByEmojis("plain :blobcat:", [])).toEqual([
      { type: "text", text: "plain :blobcat:" },
    ]);
  });
});

describe("emojifyHtml", () => {
  it("replaces shortcodes in text with img elements", () => {
    const result = emojifyHtml("<p>hi :blobcat:</p>", [blobcat]);
    expect(result).toBe(
      '<p>hi <img src="https://example.com/emoji/blobcat.png" alt=":blobcat:" title=":blobcat:" class="custom-emoji" draggable="false"></p>'
    );
  });

  it("does not replace shortcodes inside attributes", () => {
    const html = '<p><a href="https://example.com/:blobcat:">link</a></p>';
    expect(emojifyHtml(html, [blobcat])).toBe(html);
  });

  it("returns the html unchanged when there are no emojis", () => {
    const html = "<p>hi :blobcat:</p>";
    expect(emojifyHtml(html, [])).toBe(html);
  });
});
