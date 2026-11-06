import { CustomEmoji } from "../types";

export const CUSTOM_EMOJI_CLASS = "custom-emoji";

const SHORTCODE_PATTERN = /:([a-zA-Z0-9_]+):/g;

export type EmojiSegment =
  | { type: "text"; text: string }
  | { type: "emoji"; emoji: CustomEmoji };

export function splitByEmojis(
  text: string,
  emojis: CustomEmoji[] | undefined
): EmojiSegment[] {
  if (!emojis || emojis.length === 0) {
    return text ? [{ type: "text", text }] : [];
  }

  const emojiMap = new Map(emojis.map((e) => [e.shortcode, e]));
  const segments: EmojiSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SHORTCODE_PATTERN)) {
    const emoji = emojiMap.get(match[1]);
    if (!emoji) continue;
    const index = match.index;
    if (index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, index) });
    }
    segments.push({ type: "emoji", emoji });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }

  return segments;
}

function createEmojiImage(doc: Document, emoji: CustomEmoji): HTMLImageElement {
  const img = doc.createElement("img");
  img.src = emoji.url;
  img.alt = `:${emoji.shortcode}:`;
  img.title = `:${emoji.shortcode}:`;
  img.className = CUSTOM_EMOJI_CLASS;
  img.draggable = false;
  return img;
}

export function emojifyHtml(
  html: string,
  emojis: CustomEmoji[] | undefined
): string {
  if (!emojis || emojis.length === 0) return html;

  const template = document.createElement("template");
  template.innerHTML = html;
  const doc = template.content.ownerDocument;

  const walker = doc.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const node of textNodes) {
    const segments = splitByEmojis(node.data, emojis);
    if (!segments.some((s) => s.type === "emoji")) continue;

    const fragment = doc.createDocumentFragment();
    for (const segment of segments) {
      fragment.appendChild(
        segment.type === "text"
          ? doc.createTextNode(segment.text)
          : createEmojiImage(doc, segment.emoji)
      );
    }
    node.replaceWith(fragment);
  }

  return template.innerHTML;
}
