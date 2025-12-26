import React from "react";
import { Group, Box, Image, CloseButton, Text } from "@mantine/core";
import { UploadedMedia } from "../types";

interface MediaPreviewProps {
  media: UploadedMedia[];
  onRemove: (previewUrl: string) => void;
}

export function MediaPreview({ media, onRemove }: MediaPreviewProps) {
  if (media.length === 0) return null;

  return (
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
              onClick={() => onRemove(m.previewUrl)}
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
  );
}
