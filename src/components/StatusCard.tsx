import { useState } from "react";
import { Card, Group, Avatar, Text, Stack, Image, Box, Anchor, ActionIcon } from "@mantine/core";
import { MastodonStatus } from "../types";
import {
  favouriteStatus,
  unfavouriteStatus,
  reblogStatus,
  unreblogStatus,
} from "../utils/mastodon";

interface StatusCardProps {
  status: MastodonStatus;
  instance: string;
  token: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function StatusCard({ status, instance, token }: StatusCardProps) {
  const displayStatus = status.reblog ?? status;
  const isReblog = status.reblog !== null;
  const [favourited, setFavourited] = useState(displayStatus.favourited);
  const [reblogged, setReblogged] = useState(displayStatus.reblogged);

  const handleFavourite = async () => {
    try {
      if (favourited) {
        await unfavouriteStatus(instance, token, displayStatus.id);
        setFavourited(false);
      } else {
        await favouriteStatus(instance, token, displayStatus.id);
        setFavourited(true);
      }
    } catch (e) {
      console.error("Failed to toggle favourite:", e);
    }
  };

  const handleReblog = async () => {
    try {
      if (reblogged) {
        await unreblogStatus(instance, token, displayStatus.id);
        setReblogged(false);
      } else {
        await reblogStatus(instance, token, displayStatus.id);
        setReblogged(true);
      }
    } catch (e) {
      console.error("Failed to toggle reblog:", e);
    }
  };

  return (
    <Card p="sm" style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))" }} radius={0}>
      {isReblog && (
        <Text size="xs" c="dimmed" mb="xs">
          {status.account.display_name || status.account.username} reblogged
        </Text>
      )}
      <Group align="flex-start" gap="sm">
        <Anchor href={displayStatus.account.url} target="_blank" rel="noopener noreferrer">
          <Avatar src={displayStatus.account.avatar} radius="xl" size="md" />
        </Anchor>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Text size="sm" fw={600}>
              {displayStatus.account.display_name || displayStatus.account.username}
            </Text>
            <Text size="xs" c="dimmed">
              @{displayStatus.account.acct}
            </Text>
          </Group>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              {displayStatus.visibility === "public" && "🌐"}
              {displayStatus.visibility === "unlisted" && "🔓"}
              {displayStatus.visibility === "private" && "🔒"}
              {displayStatus.visibility === "direct" && "✉️"}
            </Text>
            <Anchor
              href={displayStatus.url}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              c="dimmed"
            >
              {formatDate(displayStatus.created_at)}
            </Anchor>
            <ActionIcon
              variant="subtle"
              size="xs"
              color={favourited ? "yellow" : "gray"}
              onClick={handleFavourite}
            >
              {favourited ? "★" : "☆"}
            </ActionIcon>
{(displayStatus.visibility === "public" || displayStatus.visibility === "unlisted") && (
              <ActionIcon
                variant="subtle"
                size="xs"
                color={reblogged ? "green" : "gray"}
                onClick={handleReblog}
              >
                🔁
              </ActionIcon>
            )}
          </Group>
          {displayStatus.spoiler_text && (
            <Text size="sm" c="yellow">
              CW: {displayStatus.spoiler_text}
            </Text>
          )}
          <Box
            style={{ wordBreak: "break-word" }}
            dangerouslySetInnerHTML={{ __html: displayStatus.content }}
          />
          {displayStatus.media_attachments.length > 0 && (
            <Group gap="xs" mt="xs">
              {displayStatus.media_attachments.map((media) => (
                <Image
                  key={media.id}
                  src={media.preview_url}
                  alt={media.description ?? ""}
                  w={100}
                  h={100}
                  fit="cover"
                  radius="sm"
                />
              ))}
            </Group>
          )}
        </Stack>
      </Group>
    </Card>
  );
}
