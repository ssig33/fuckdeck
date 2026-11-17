import { useMemo, useState } from "react";
import { Card, Group, Avatar, Text, Stack, Image, Box, Anchor, ActionIcon } from "@mantine/core";
import { Account, MastodonStatus } from "../types";
import { statusAction } from "../utils/api";
import { extractGyazoIds } from "../utils/gyazo";
import { emojifyHtml } from "../utils/emoji";
import { EmojiText } from "./EmojiText";
import { ReplyModal } from "./ReplyModal";
import { MediaModal } from "./MediaModal";
import { GyazoImage } from "./GyazoImage";

interface StatusCardProps {
  status: MastodonStatus;
  /** The account the status was fetched with; actions are taken as it. */
  account: Account;
  showVia?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function StatusCard({ status, account, showVia }: StatusCardProps) {
  const displayStatus = status.reblog ?? status;
  const isReblog = status.reblog !== null;
  const [favourited, setFavourited] = useState(displayStatus.favourited);
  const [reblogged, setReblogged] = useState(displayStatus.reblogged);
  const [replyModalOpened, setReplyModalOpened] = useState(false);
  const [replyTo, setReplyTo] = useState<MastodonStatus | null>(null);
  const [mediaModalOpened, setMediaModalOpened] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const handleFavourite = async () => {
    try {
      if (favourited) {
        await statusAction(account, displayStatus.id, "unfavourite");
        setFavourited(false);
      } else {
        await statusAction(account, displayStatus.id, "favourite");
        setFavourited(true);
      }
    } catch (e) {
      console.error("Failed to toggle favourite:", e);
    }
  };

  const handleReblog = async () => {
    try {
      if (reblogged) {
        await statusAction(account, displayStatus.id, "unreblog");
        setReblogged(false);
      } else {
        await statusAction(account, displayStatus.id, "reblog");
        setReblogged(true);
      }
    } catch (e) {
      console.error("Failed to toggle reblog:", e);
    }
  };

  const handleReply = () => {
    setReplyTo(displayStatus);
    setReplyModalOpened(true);
  };

  const handleCloseReply = () => {
    setReplyModalOpened(false);
    setReplyTo(null);
  };

  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);
    setMediaModalOpened(true);
  };

  const gyazoIds = useMemo(
    () => extractGyazoIds(displayStatus.content),
    [displayStatus.content]
  );

  const contentHtml = useMemo(
    () => emojifyHtml(displayStatus.content, displayStatus.emojis),
    [displayStatus.content, displayStatus.emojis]
  );

  return (
    <Card p="sm" style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))" }} radius={0}>
      {showVia && (
        <Text size="xs" c="dimmed" mb={4}>
          via @{account.user?.username ?? "?"}@{account.instance}
        </Text>
      )}
      {isReblog && (
        <Text size="xs" c="dimmed" mb="xs">
          <EmojiText
            text={status.account.display_name || status.account.username}
            emojis={status.account.emojis}
          />{" "}
          reblogged
        </Text>
      )}
      <Group align="flex-start" gap="sm">
        <Anchor href={displayStatus.account.url} target="_blank" rel="noopener noreferrer">
          <Avatar src={displayStatus.account.avatar} radius="xl" size="md" />
        </Anchor>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Text size="sm" fw={600}>
              <EmojiText
                text={displayStatus.account.display_name || displayStatus.account.username}
                emojis={displayStatus.account.emojis}
              />
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
              color="gray"
              onClick={handleReply}
            >
              💬
            </ActionIcon>
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
              CW: <EmojiText text={displayStatus.spoiler_text} emojis={displayStatus.emojis} />
            </Text>
          )}
          <Box
            style={{ wordBreak: "break-word" }}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
          {displayStatus.media_attachments.length > 0 && (
            <Group gap="xs" mt="xs">
              {displayStatus.media_attachments.map((media, index) => (
                <Image
                  key={media.id}
                  src={media.preview_url}
                  alt={media.description ?? ""}
                  w={100}
                  h={100}
                  fit="cover"
                  radius="sm"
                  onClick={() => handleMediaClick(index)}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </Group>
          )}
          {gyazoIds.length > 0 && (
            <Group gap="xs" mt="xs">
              {gyazoIds.map((id) => (
                <GyazoImage key={id} gyazoId={id} />
              ))}
            </Group>
          )}
        </Stack>
      </Group>
      <ReplyModal
        opened={replyModalOpened}
        onClose={handleCloseReply}
        replyTo={replyTo}
        sourceInstance={account.instance}
      />
      <MediaModal
        opened={mediaModalOpened}
        onClose={() => setMediaModalOpened(false)}
        media={displayStatus.media_attachments}
        initialIndex={selectedMediaIndex}
      />
    </Card>
  );
}
