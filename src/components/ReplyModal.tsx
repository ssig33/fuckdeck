import { useState, useEffect } from "react";
import { Modal, Stack, Textarea, Button, Select, Text } from "@mantine/core";
import { useAccounts } from "../hooks/useAccounts";
import { postStatus } from "../utils/mastodon";
import { MastodonStatus, Visibility } from "../types";

const MAX_LENGTH = 500;

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "private", label: "Followers only" },
  { value: "direct", label: "Direct" },
];

interface ReplyModalProps {
  opened: boolean;
  onClose: () => void;
  replyTo: MastodonStatus | null;
}

export function ReplyModal({ opened, onClose, replyTo }: ReplyModalProps) {
  const { accounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // アカウント自動選択（返信先と同じインスタンス優先）
  useEffect(() => {
    if (replyTo && accounts.length > 0) {
      // 返信先のインスタンスを抽出
      const replyToInstance = replyTo.account.url.replace(/^https?:\/\//, '').split('/')[0];

      // 同じインスタンスのアカウントを探す
      const sameInstanceAccount = accounts.find(
        (a) => a.instance === replyToInstance
      );

      setSelectedAccountId(sameInstanceAccount?.id || accounts[0].id);
    }
  }, [replyTo, accounts]);

  // メンション自動挿入とvisibility設定
  useEffect(() => {
    if (replyTo) {
      setContent(`@${replyTo.account.acct} `);
      setVisibility(replyTo.visibility);
    }
  }, [replyTo]);

  const handlePost = async () => {
    if (!selectedAccountId || !content.trim() || !replyTo) return;

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    if (!selectedAccount) return;

    setIsPosting(true);
    setError(null);

    try {
      await postStatus(selectedAccount.instance, selectedAccount.accessToken, {
        status: content,
        visibility,
        in_reply_to_id: replyTo.id,
      });

      setContent("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setIsPosting(false);
    }
  };

  const handleClose = () => {
    setContent("");
    setError(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canPost) {
        handlePost();
      }
    }
  };

  if (!replyTo) return null;

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `@${account.user?.username ?? "..."}@${account.instance}`,
  }));

  const canPost =
    selectedAccountId &&
    content.trim() &&
    content.length <= MAX_LENGTH;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`@${replyTo.account.acct} に返信中`}
      size="lg"
    >
      <Stack gap="sm">
        <Select
          label="投稿アカウント"
          data={accountOptions}
          value={selectedAccountId}
          onChange={(value) => setSelectedAccountId(value || "")}
          disabled={accounts.length === 0}
        />

        <Textarea
          label="返信内容"
          placeholder="返信を入力..."
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          minRows={4}
          maxRows={8}
          autosize
        />

        <Text size="xs" c={content.length > MAX_LENGTH ? "red" : "dimmed"}>
          {content.length}/{MAX_LENGTH}
        </Text>

        <Select
          label="公開範囲"
          data={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={(v) => setVisibility((v as Visibility) ?? "public")}
        />

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        <Button onClick={handlePost} loading={isPosting} disabled={!canPost}>
          返信
        </Button>
      </Stack>
    </Modal>
  );
}
