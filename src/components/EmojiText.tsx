import { CustomEmoji } from "../types";
import { CUSTOM_EMOJI_CLASS, splitByEmojis } from "../utils/emoji";

interface EmojiTextProps {
  text: string;
  emojis: CustomEmoji[] | undefined;
}

export function EmojiText({ text, emojis }: EmojiTextProps) {
  return (
    <>
      {splitByEmojis(text, emojis).map((segment, index) =>
        segment.type === "text" ? (
          segment.text
        ) : (
          <img
            key={index}
            src={segment.emoji.url}
            alt={`:${segment.emoji.shortcode}:`}
            title={`:${segment.emoji.shortcode}:`}
            className={CUSTOM_EMOJI_CLASS}
            draggable={false}
          />
        )
      )}
    </>
  );
}
