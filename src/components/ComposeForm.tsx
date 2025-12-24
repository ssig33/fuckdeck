import { useState, useRef, useEffect } from "react";
import {
  Stack,
  Textarea,
  TextInput,
  Button,
  Select,
  Text,
  Group,
  Image,
  CloseButton,
  Box,
  FileButton,
} from "@mantine/core";
import { useAccounts } from "../hooks/useAccounts";
import { postStatus, uploadMedia } from "../utils/mastodon";
import { Visibility, MediaAttachment } from "../types";

const MAX_LENGTH = 500;
const MAX_MEDIA = 4;

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "private", label: "Followers only" },
  { value: "direct", label: "Direct" },
];

interface UploadedMedia {
  file: File;
  previewUrl: string;
  attachment?: MediaAttachment;
  uploading: boolean;
  error?: string;
}

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
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const resetRef = useRef<() => void>(null);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handleFilesSelected = async (files: File[]) => {
    const remainingSlots = MAX_MEDIA - media.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length === 0 || !selectedAccount) return;

    const newMedia: UploadedMedia[] = filesToAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }));

    setMedia((prev) => [...prev, ...newMedia]);

    for (let i = 0; i < newMedia.length; i++) {
      const mediaItem = newMedia[i];
      try {
        const attachment = await uploadMedia(
          selectedAccount.instance,
          selectedAccount.accessToken,
          mediaItem.file
        );
        setMedia((prev) =>
          prev.map((m) =>
            m.previewUrl === mediaItem.previewUrl
              ? { ...m, attachment, uploading: false }
              : m
          )
        );
      } catch (err) {
        setMedia((prev) =>
          prev.map((m) =>
            m.previewUrl === mediaItem.previewUrl
              ? {
                  ...m,
                  uploading: false,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : m
          )
        );
      }
    }

    resetRef.current?.();
  };

  const removeMedia = (previewUrl: string) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.previewUrl === previewUrl);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((m) => m.previewUrl !== previewUrl);
    });
  };

  const handlePost = async () => {
    if (!selectedAccount || !content.trim()) return;

    const uploadingMedia = media.filter((m) => m.uploading);
    if (uploadingMedia.length > 0) {
      setError("Please wait for media uploads to complete");
      return;
    }

    const failedMedia = media.filter((m) => m.error);
    if (failedMedia.length > 0) {
      setError("Some media failed to upload. Remove them and try again.");
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      const mediaIds = media
        .filter((m) => m.attachment)
        .map((m) => m.attachment!.id);

      await postStatus(selectedAccount.instance, selectedAccount.accessToken, {
        status: content,
        visibility,
        spoiler_text: spoilerText || undefined,
        media_ids: mediaIds.length > 0 ? mediaIds : undefined,
      });

      setContent("");
      setSpoilerText("");
      media.forEach((m) => URL.revokeObjectURL(m.previewUrl));
      setMedia([]);
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
    !media.some((m) => m.uploading);

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
        minRows={4}
        maxRows={8}
        autosize
      />

      <Group justify="space-between">
        <Text size="xs" c={content.length > MAX_LENGTH ? "red" : "dimmed"}>
          {content.length}/{MAX_LENGTH}
        </Text>
      </Group>

      {media.length > 0 && (
        <Group gap="xs">
          {media.map((m) => (
            <Box
              key={m.previewUrl}
              pos="relative"
              style={{ width: 60, height: 60 }}
            >
              <Image
                src={m.previewUrl}
                w={60}
                h={60}
                fit="cover"
                radius="sm"
                style={{ opacity: m.uploading ? 0.5 : 1 }}
              />
              {!m.uploading && (
                <CloseButton
                  size="xs"
                  pos="absolute"
                  top={2}
                  right={2}
                  onClick={() => removeMedia(m.previewUrl)}
                />
              )}
              {m.error && (
                <Text size="xs" c="red" pos="absolute" bottom={0}>
                  Error
                </Text>
              )}
            </Box>
          ))}
        </Group>
      )}

      <Group>
        <FileButton
          onChange={(files) => files && handleFilesSelected(files)}
          accept="image/*"
          multiple
          resetRef={resetRef}
          disabled={media.length >= MAX_MEDIA || !selectedAccount}
        >
          {(props) => (
            <Button
              variant="light"
              size="xs"
              {...props}
              disabled={media.length >= MAX_MEDIA || !selectedAccount}
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
        onChange={(v) => setVisibility((v as Visibility) ?? "public")}
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
