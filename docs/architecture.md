# FuckDeck アーキテクチャ

TweetDeckライクなMastodonクライアント。React + Mantine で構築。

## ディレクトリ構成

```
src/
├── index.tsx           # エントリポイント
├── App.tsx             # メインアプリケーション
├── types/
│   └── index.ts        # 型定義
├── hooks/
│   ├── useAccounts.tsx # アカウント管理
│   └── useTimeline.ts  # タイムライン取得
├── components/
│   ├── Header.tsx
│   ├── LoginModal.tsx
│   ├── ColumnLayout.tsx
│   ├── TimelineColumn.tsx
│   └── StatusCard.tsx
└── utils/
    ├── storage.ts      # localStorage操作
    └── mastodon.ts     # Mastodon API
```

## 状態管理

```
MantineProvider
└── AccountProvider (React Context)
    └── App
        ├── Header
        ├── ColumnLayout
        │   └── TimelineColumn[] (各アカウントごと)
        │       └── StatusCard[]
        └── LoginModal
```

### AccountContext

アカウント情報をアプリ全体で共有する。

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

キー: `fuckdeck_accounts`

```typescript
interface StoredData {
  accounts: Account[];
  pendingAuth: PendingAuth | null;
}
```

## 認証フロー

```
[ユーザー]
    │
    ▼ インスタンスURL入力
[LoginModal]
    │
    ▼ POST /api/v1/apps
[Mastodon] → clientId, clientSecret
    │
    ▼ pendingAuthをlocalStorageに保存
[LoginModal]
    │
    ▼ /oauth/authorize にリダイレクト
[Mastodon] → ユーザー認可
    │
    ▼ ?code=xxx でコールバック
[App.tsx]
    │
    ▼ POST /oauth/token
[Mastodon] → accessToken
    │
    ▼ GET /api/v1/accounts/verify_credentials
[Mastodon] → ユーザー情報
    │
    ▼ アカウント保存、pendingAuth削除
[AccountContext]
```

## タイムライン取得

`useTimeline` フックが各アカウントのタイムラインを管理する。

- 初回: `GET /api/v1/timelines/home` で取得
- 以降: 60秒間隔でポーリング（`since_id` で差分取得）
- 新しい投稿は先頭に追加

## コンポーネント

| コンポーネント | 責務 |
|--------------|------|
| Header | タイトル表示、アカウント追加ボタン |
| LoginModal | インスタンスURL入力、OAuth開始 |
| ColumnLayout | アカウントごとのカラムを横並び表示 |
| TimelineColumn | 1アカウントのタイムライン表示、削除ボタン |
| StatusCard | 1投稿の表示（リブログ対応） |

## 設計ルール

- default export 禁止（named export のみ）
- components はフラット配置（サブディレクトリなし）
- API関数は utils に配置
