import { useState, useEffect } from "react";
import { Modal, Stack, Textarea, Button, Select, Text } from "@mantine/core";
import { useAccounts } from "../hooks/useAccounts";
import { useInstanceLimits } from "../hooks/useInstanceLimits";
import { postStatus, resolveStatusId } from "../utils/api";
import { MastodonStatus, Visibility } from "../types";
import { VISIBILITY_OPTIONS, isSubmitShortcut, toAccountOptions } from "./compose";

interface ReplyModalProps {
  opened: boolean;
  onClose: () => void;
  replyTo: MastodonStatus | null;
  /** The instance `replyTo` was fetched from; its id belongs to this instance. */
  sourceInstance: string;
}

export function ReplyModal({
  opened,
  onClose,
  replyTo,
  sourceInstance,
}: ReplyModalProps) {
  const { accounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const limits = useInstanceLimits(selectedAccount);

  // Prefer an account on the instance the status was fetched from, so the
  // status id can be used without resolving it.
  useEffect(() => {
    if (replyTo && accounts.length > 0) {
      const sameInstanceAccount = accounts.find(
        (a) => a.instance === sourceInstance
      );
      setSelectedAccountId(sameInstanceAccount?.id || accounts[0].id);
    }
  }, [replyTo, accounts, sourceInstance]);

  // メンション自動挿入とvisibility設定
  useEffect(() => {
    if (replyTo) {
      setContent(`@${replyTo.account.acct} `);
      setVisibility(replyTo.visibility);
    }
  }, [replyTo]);

  const handlePost = async () => {
    if (!selectedAccount || !content.trim() || !replyTo) return;

    setIsPosting(true);
    setError(null);

    try {
      const inReplyToId = await resolveStatusId(
        selectedAccount,
        replyTo,
        sourceInstance
      );
      await postStatus(selectedAccount, {
        status: content,
        visibility,
        in_reply_to_id: inReplyToId,
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
    if (isSubmitShortcut(e)) {
      e.preventDefault();
      if (canPost) {
        handlePost();
      }
    }
  };

  if (!replyTo) return null;

  const accountOptions = toAccountOptions(accounts);

  const canPost =
    selectedAccount &&
    content.trim() &&
    content.length <= limits.maxCharacters &&
    !isPosting;

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

        <Text
          size="xs"
          c={content.length > limits.maxCharacters ? "red" : "dimmed"}
        >
          {content.length}/{limits.maxCharacters}
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
