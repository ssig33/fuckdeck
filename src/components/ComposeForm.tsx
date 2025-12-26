import { useState, useEffect } from "react";
import {
  Stack,
  Textarea,
  TextInput,
  Button,
  Select,
  Text,
  Group,
  FileButton,
} from "@mantine/core";
import { useAccounts } from "../hooks/useAccounts";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { postStatus } from "../utils/mastodon";
import {
  getDefaultVisibility,
  saveDefaultVisibility,
} from "../utils/storage";
import { Visibility } from "../types";
import { MediaPreview } from "./MediaPreview";

const MAX_LENGTH = 500;
const MAX_MEDIA = 4;

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "private", label: "Followers only" },
  { value: "direct", label: "Direct" },
];

export function ComposeForm() {
  const { accounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [spoilerText, setSpoilerText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const {
    media,
    isUploading,
    hasError,
    canAddMore,
    addFiles,
    removeMedia,
    clearAll,
    getMediaIds,
    resetRef,
  } = useMediaUpload({
    instance: selectedAccount?.instance ?? "",
    accessToken: selectedAccount?.accessToken ?? "",
    maxMedia: MAX_MEDIA,
  });

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId) {
      const saved = getDefaultVisibility(selectedAccountId);
      if (saved) {
        setVisibility(saved);
      }
    }
  }, [selectedAccountId]);

  const handleVisibilityChange = (v: Visibility) => {
    setVisibility(v);
    if (selectedAccountId) {
      saveDefaultVisibility(selectedAccountId, v);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canPost) {
        handlePost();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      addFiles(imageFiles);
    }
  };

  const handlePost = async () => {
    if (!selectedAccount || !content.trim()) return;

    if (isUploading) {
      setError("Please wait for media uploads to complete");
      return;
    }

    if (hasError) {
      setError("Some media failed to upload. Remove them and try again.");
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      const mediaIds = getMediaIds();

      await postStatus(selectedAccount.instance, selectedAccount.accessToken, {
        status: content,
        visibility,
        spoiler_text: spoilerText || undefined,
        media_ids: mediaIds.length > 0 ? mediaIds : undefined,
      });

      setContent("");
      setSpoilerText("");
      clearAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setIsPosting(false);
    }
  };

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `@${account.user?.username ?? "..."}@${account.instance}`,
  }));

  const canPost =
    selectedAccount &&
    content.trim() &&
    content.length <= MAX_LENGTH &&
    !isUploading;

  return (
    <Stack gap="sm">
      <Select
        label="Account"
        data={accountOptions}
        value={selectedAccountId}
        onChange={setSelectedAccountId}
        disabled={accounts.length === 0}
        placeholder={accounts.length === 0 ? "Add an account first" : undefined}
      />

      <TextInput
        label="CW"
        placeholder="Content warning (optional)"
        value={spoilerText}
        onChange={(e) => setSpoilerText(e.currentTarget.value)}
      />

      <Textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        minRows={4}
        maxRows={8}
        autosize
      />

      <Group justify="space-between">
        <Text size="xs" c={content.length > MAX_LENGTH ? "red" : "dimmed"}>
          {content.length}/{MAX_LENGTH}
        </Text>
      </Group>

      <MediaPreview media={media} onRemove={removeMedia} />

      <Group>
        <FileButton
          onChange={(files) => files && addFiles(files)}
          accept="image/*"
          multiple
          resetRef={resetRef}
          disabled={!canAddMore || !selectedAccount}
        >
          {(props) => (
            <Button
              variant="light"
              size="xs"
              {...props}
              disabled={!canAddMore || !selectedAccount}
            >
              Add image ({media.length}/{MAX_MEDIA})
            </Button>
          )}
        </FileButton>
      </Group>

      <Select
        label="Visibility"
        data={VISIBILITY_OPTIONS}
        value={visibility}
        onChange={(v) => handleVisibilityChange((v as Visibility) ?? "public")}
      />

      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}

      <Button onClick={handlePost} loading={isPosting} disabled={!canPost}>
        Post
      </Button>
    </Stack>
  );
}
