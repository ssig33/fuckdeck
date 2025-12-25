import { useState, useEffect } from "react";
import { Modal, Stack, Group, Box, ActionIcon, Text, Anchor, Image } from "@mantine/core";
import { MediaAttachment } from "../types";

interface MediaModalProps {
  opened: boolean;
  onClose: () => void;
  media: MediaAttachment[];
  initialIndex: number;
}

export function MediaModal({ opened, onClose, media, initialIndex }: MediaModalProps) {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, media.length - 1))
  );

  // モーダルが開くたびに currentIndex をリセット
  useEffect(() => {
    if (opened) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, media.length - 1)));
    }
  }, [opened, initialIndex, media.length]);

  // キーボード操作
  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [opened, currentIndex, media.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(media.length - 1, prev + 1));
  };

  if (media.length === 0) return null;

  const currentMedia = media[currentIndex];

  const renderMedia = (mediaItem: MediaAttachment) => {
    const commonStyles = {
      maxWidth: "90vw",
      maxHeight: "80vh",
      objectFit: "contain" as const,
    };

    switch (mediaItem.type) {
      case "image":
        return (
          <Image
            src={mediaItem.url}
            alt={mediaItem.description ?? ""}
            style={commonStyles}
          />
        );

      case "video":
        return (
          <video src={mediaItem.url} controls style={commonStyles}>
            {mediaItem.description && (
              <track kind="descriptions" label={mediaItem.description} />
            )}
          </video>
        );

      case "gifv":
        return (
          <video src={mediaItem.url} autoPlay loop muted style={commonStyles}>
            {mediaItem.description && (
              <track kind="descriptions" label={mediaItem.description} />
            )}
          </video>
        );

      case "audio":
        return (
          <Box style={{ width: "100%" }}>
            <audio src={mediaItem.url} controls style={{ width: "100%" }} />
            {mediaItem.description && <Text mt="sm">{mediaItem.description}</Text>}
          </Box>
        );

      case "unknown":
      default:
        return (
          <Stack align="center">
            <Text>このメディアタイプは表示できません</Text>
            <Anchor href={mediaItem.url} target="_blank" download>
              ダウンロード
            </Anchor>
          </Stack>
        );
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      closeOnClickOutside={true}
      title="メディア"
    >
      <Stack gap="md">
        {/* メディア表示エリア */}
        <Box style={{ display: "flex", justifyContent: "center" }}>
          {renderMedia(currentMedia)}
        </Box>

        {/* ナビゲーション（複数メディアの場合のみ） */}
        {media.length > 1 && (
          <Group justify="center">
            <ActionIcon
              size="lg"
              variant="filled"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              ←
            </ActionIcon>
            <Text>
              {currentIndex + 1} / {media.length}
            </Text>
            <ActionIcon
              size="lg"
              variant="filled"
              onClick={handleNext}
              disabled={currentIndex === media.length - 1}
            >
              →
            </ActionIcon>
          </Group>
        )}

        {/* 代替テキスト */}
        {currentMedia.description && (
          <Text size="sm" c="dimmed">
            {currentMedia.description}
          </Text>
        )}

        {/* ダウンロードボタン */}
        <Anchor href={currentMedia.url} download target="_blank">
          ダウンロード
        </Anchor>
      </Stack>
    </Modal>
  );
}
