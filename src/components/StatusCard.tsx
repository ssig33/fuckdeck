import { Card, Group, Avatar, Text, Stack, Image, Box } from "@mantine/core";
import { MastodonStatus } from "../types";

interface StatusCardProps {
  status: MastodonStatus;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function StatusCard({ status }: StatusCardProps) {
  const displayStatus = status.reblog ?? status;
  const isReblog = status.reblog !== null;

  return (
    <Card p="sm" style={{ borderBottom: "1px solid #333" }} radius={0}>
      {isReblog && (
        <Text size="xs" c="dimmed" mb="xs">
          {status.account.display_name || status.account.username} reblogged
        </Text>
      )}
      <Group align="flex-start" gap="sm">
        <Avatar src={displayStatus.account.avatar} radius="xl" size="md" />
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Text size="sm" fw={600}>
              {displayStatus.account.display_name || displayStatus.account.username}
            </Text>
            <Text size="xs" c="dimmed">
              @{displayStatus.account.acct}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {formatDate(displayStatus.created_at)}
          </Text>
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
