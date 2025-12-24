# FuckDeck Architecture

A TweetDeck-like Mastodon client built with React + Mantine.

## Directory Structure

```
src/
├── index.tsx           # Entry point
├── App.tsx             # Main application
├── types/
│   └── index.ts        # Type definitions
├── hooks/
│   ├── useAccounts.tsx # Account management
│   └── useTimeline.ts  # Timeline fetching
├── components/
│   ├── Header.tsx
│   ├── LoginModal.tsx
│   ├── Sidebar.tsx
│   ├── ComposeForm.tsx
│   ├── ColumnLayout.tsx
│   ├── TimelineColumn.tsx
│   └── StatusCard.tsx
└── utils/
    ├── storage.ts      # localStorage operations
    └── mastodon.ts     # Mastodon API
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

## Timeline Fetching

`useTimeline` hook manages each account's timeline.

- Initial: Fetch via `GET /api/v1/timelines/home`
- Thereafter: Poll every 60 seconds (using `since_id` for delta fetch)
- New posts are prepended

## Posting

`ComposeForm` component handles status posting.

- Select account from dropdown
- Content Warning (CW) input
- Text content with character counter (500 chars)
- Image attachments (up to 4)
- Visibility selection (public/unlisted/private/direct)

API functions:
- `uploadMedia`: `POST /api/v2/media`
- `postStatus`: `POST /api/v1/statuses`

## Components

| Component | Responsibility |
|-----------|----------------|
| Header | Title display, add account button |
| LoginModal | Instance URL input, OAuth initiation |
| Sidebar | Container for ComposeForm |
| ComposeForm | Post composition with media upload |
| ColumnLayout | Horizontal layout of account columns |
| TimelineColumn | Single account timeline, delete button |
| StatusCard | Single post display (reblog support) |

## Design Rules

- No default exports (named exports only)
- Components are flat (no subdirectories)
- API functions go in utils
