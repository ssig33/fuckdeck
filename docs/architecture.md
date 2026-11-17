# FuckDeck Architecture

A TweetDeck-like Mastodon and Misskey client built with React + Mantine.

## Directory Structure

```
src/
├── index.tsx           # Entry point
├── App.tsx             # Main application
├── types/
│   └── index.ts        # Type definitions
├── hooks/
│   ├── useAccounts.tsx      # Account management
│   ├── useInstanceLimits.ts # Instance posting limits
│   ├── useTimeline.ts       # Timeline fetching
│   └── useUnifiedTimeline.ts # Home timelines of all accounts merged
├── components/
│   ├── Header.tsx
│   ├── LoginModal.tsx
│   ├── Sidebar.tsx
│   ├── ComposeForm.tsx
│   ├── ColumnLayout.tsx
│   ├── TimelineColumn.tsx
│   ├── UnifiedTimelineColumn.tsx
│   └── StatusCard.tsx
└── utils/
    ├── storage.ts      # localStorage operations
    ├── api.ts          # Calls dispatched by the account's platform
    ├── mastodon.ts     # Mastodon API
    └── misskey.ts      # Misskey API, converted to Mastodon shapes
```

## Layout

```
┌─────────────────────────────────────┐
│              Header                 │
├─────────┬───────────────────────────┤
│ Sidebar │       ColumnLayout        │
│ (300px) │ [Column1] [Column2] ...   │
└─────────┴───────────────────────────┘
```

## State Management

```
MantineProvider
└── AccountProvider (React Context)
    └── App
        ├── Header
        ├── Sidebar
        │   └── ComposeForm
        ├── ColumnLayout
        │   ├── UnifiedTimelineColumn (home / local, each when enabled in Header)
        │   └── TimelineColumn[] (per account)
        │       └── StatusCard[]
        └── LoginModal
```

### AccountContext

Shares account information across the app.

```typescript
interface AccountContextValue {
  accounts: Account[];
  pendingAuth: PendingAuth | null;
  addAccount: (account: Account) => void;
  removeAccount: (accountId: string) => void;
  updateAccount: (account: Account) => void;
  setPendingAuth: (auth: PendingAuth | null) => void;
}
```

### localStorage

Key: `fuckdeck_accounts`

```typescript
interface StoredData {
  accounts: Account[];
  pendingAuth: PendingAuth | null;
}
```

## Authentication Flow

```
[User]
    │
    ▼ Enter instance URL
[LoginModal]
    │
    ▼ POST /api/v1/apps
[Mastodon] → clientId, clientSecret
    │
    ▼ Save pendingAuth to localStorage
[LoginModal]
    │
    ▼ Redirect to /oauth/authorize
[Mastodon] → User authorization
    │
    ▼ Callback with ?code=xxx
[App.tsx]
    │
    ▼ POST /oauth/token
[Mastodon] → accessToken
    │
    ▼ GET /api/v1/accounts/verify_credentials
[Mastodon] → User info
    │
    ▼ Save account, clear pendingAuth
[AccountContext]
```

LoginModal reads the server's NodeInfo (`/.well-known/nodeinfo`). When the
software is Misskey or a fork of it, login uses MiAuth instead:

```
[LoginModal] → Save pendingAuth (platform: misskey, session)
    │
    ▼ Redirect to /miauth/{session}
[Misskey] → User authorization
    │
    ▼ Callback with ?session=xxx
[App.tsx]
    │
    ▼ POST /api/miauth/{session}/check
[Misskey] → token, user
```

## Platforms

`Account.platform` is `"mastodon"` (also when missing) or `"misskey"`.
Components and hooks call `utils/api.ts`, which picks the platform's
implementation. `utils/misskey.ts` converts Misskey notes, users and
notifications into the Mastodon types, so the UI only knows Mastodon shapes.

- Favourite is the `❤` reaction; reblog is a renote (`notes/unrenote` undoes it)
- A renote without its own text, CW or files becomes a reblog; a quote shows
  the quoted note in a blockquote
- Note text (MFM) is rendered as plain text with links, mentions and line breaks
- Custom emojis without a URL in the note use `https://{instance}/emoji/{name}.webp`
- Visibility: home = unlisted, followers = private, specified = direct
- Streaming connects the `homeTimeline` and `main` channels, plus
  `localTimeline` while the unified local timeline is shown. Deletions are
  not delivered on these channels, so deleted notes stay until reloaded
- Notification types without a Mastodon counterpart are dropped

## Timeline Fetching

`useTimeline` hook manages each account's timeline.

- Initial: Fetch via `GET /api/v1/timelines/home`
- Thereafter: Poll every 60 seconds (using `since_id` for delta fetch)
- New posts are prepended

### Unified Timeline

`useUnifiedTimeline` merges the home timelines of all accounts into one column,
shown before the account columns when the Header switch is on (stored in
localStorage under `fuckdeck_show_unified_timeline`).

- A post seen by several accounts is shown once, keyed by `uri`; the first
  account in the list is used for its actions
- Posts older than the oldest loaded post of any account that still has more
  history are hidden, so older pages only add rows at the bottom
- Loading older posts fetches from that account only

The unified local timeline is the same column with `kind="local"`, merging
each account's server local timeline (`GET /api/v1/timelines/public?local=true`
or Misskey `notes/local-timeline`). It has its own Header switch
(`fuckdeck_show_unified_local_timeline`). While it is shown, every stream
client also subscribes to the local timeline on its existing socket (Mastodon
`public:local`, Misskey `localTimeline`); those events carry
`timeline: 'local'` and are kept in `localStreamingStatuses`. Accounts on the
same server share one local timeline, which the `uri` dedup collapses.

## Posting

`ComposeForm` component handles status posting.

- Select account from dropdown
- Content Warning (CW) input
- Text content with character counter (limit fetched from the instance)
- Image attachments (limit fetched from the instance)
- Visibility selection (public/unlisted/private/direct)

API functions:
- `uploadMedia`: `POST /api/v2/media`
- `postStatus`: `POST /api/v1/statuses`

## Instance Limits

`getInstanceLimits` resolves the posting limits of an instance: it reads
`configuration.statuses` from `GET /api/v2/instance`, falls back to
`GET /api/v1/instance`, and finally to 500 characters / 4 attachments.

The limits are stored on the `Account` in localStorage, so they are fetched
once per account. `useInstanceLimits` reads that cache and fills it in on
demand for accounts added before the limits were persisted.

## Components

| Component | Responsibility |
|-----------|----------------|
| Header | Title display, add account button |
| LoginModal | Instance URL input, OAuth initiation |
| Sidebar | Container for ComposeForm |
| ComposeForm | Post composition with media upload |
| ColumnLayout | Horizontal layout of account columns |
| TimelineColumn | Single account timeline, delete button |
| UnifiedTimelineColumn | Home or local timelines of all accounts in one column |
| StatusCard | Single post display (reblog support) |
| EmojiText | Plain text with custom emoji images |

## Custom Emoji

Statuses and accounts carry the custom emojis they use in `emojis`.
`utils/emoji.ts` replaces `:shortcode:` with `<img class="custom-emoji">`:

- `emojifyHtml`: for status HTML content; only text nodes are replaced
- `splitByEmojis`: for plain text (display names, CW), rendered by `EmojiText`

## Installable App

`public/manifest.webmanifest` makes the app installable (standalone window,
relative `start_url` / `scope` so it works under the GitHub Pages subpath).
The icons in `public/` are made from `favicon.png` with ImageMagick: trimmed,
centered, `icon-192.png` / `icon-512.png` on transparent, `icon-maskable-512.png`
inside the maskable safe zone on a light background, `apple-touch-icon.png` on
white.

`public/sw.js` is registered from `src/index.tsx`. It is network first for
the app's own files and falls back to its cache only when offline; requests to
Mastodon / Misskey servers pass through untouched. Header shows an
"Install app" button when the browser fires `beforeinstallprompt`
(`useInstallPrompt`, Chromium only).

## Design Rules

- No default exports (named exports only)
- Components are flat (no subdirectories)
- API functions go in utils
