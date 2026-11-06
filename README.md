# FuckDeck

A TweetDeck-like Mastodon client built with React + Mantine.

**Live Demo:** https://ssig33.github.io/fuckdeck/

## Features

- Multi-account support
- Multi-column timeline view
  - Live updates over streaming, with polling as the fallback
  - Automatic reconnect and a manual reconnect button
  - Older posts load as you scroll
- Notification column combining all accounts
- Status actions: reply, favourite, reblog
- Media viewer for images, video, GIFV and audio
- Inline previews for Gyazo links
- Post composition with:
  - Account switching
  - Content Warning (CW)
  - Image attachments by file picker or paste (limit fetched from the instance)
  - Character counter (limit fetched from the instance)
  - Visibility control (public/unlisted/private/direct), remembered per account
- Light, dark and auto color schemes

## Development

```bash
pnpm install
pnpm run dev
```

## Build

```bash
pnpm run build
```

## License

[WTFPL](LICENSE)
