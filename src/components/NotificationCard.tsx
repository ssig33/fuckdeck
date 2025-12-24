import { Card, Group, Avatar, Text, Stack, Box, Badge, Anchor } from "@mantine/core";
import { UnifiedNotification, NotificationType } from "../types";

interface NotificationCardProps {
  unified: UnifiedNotification;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function getTypeLabel(type: NotificationType): { label: string; color: string } {
  const map: Record<NotificationType, { label: string; color: string }> = {
    mention: { label: "Mention", color: "blue" },
    status: { label: "Post", color: "green" },
    reblog: { label: "Boosted", color: "grape" },
    follow: { label: "Followed", color: "cyan" },
    follow_request: { label: "Follow Req", color: "yellow" },
    favourite: { label: "Faved", color: "orange" },
    poll: { label: "Poll", color: "teal" },
    update: { label: "Updated", color: "gray" },
  };
  return map[type] ?? { label: type, color: "gray" };
}

export function NotificationCard({ unified }: NotificationCardProps) {
  const { notification, targetAccount } = unified;
  const { type, account, status, created_at } = notification;
  const typeInfo = getTypeLabel(type);

  return (
    <Card p="sm" style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))" }} radius={0}>
      <Group gap="xs" mb="xs">
        <Text size="xs" c="dimmed">
          @{targetAccount.instance}
        </Text>
        <Badge size="xs" color={typeInfo.color} variant="light">
          {typeInfo.label}
        </Badge>
      </Group>

      <Group align="flex-start" gap="sm">
        <Anchor href={account.url} target="_blank" rel="noopener noreferrer">
          <Avatar src={account.avatar} radius="xl" size="sm" />
        </Anchor>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Text size="sm" fw={600}>
              {account.display_name || account.username}
            </Text>
            <Text size="xs" c="dimmed">
              @{account.acct}
            </Text>
          </Group>
          {status ? (
            <Anchor
              href={status.url}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              c="dimmed"
            >
              {formatDate(created_at)}
            </Anchor>
          ) : (
            <Text size="xs" c="dimmed">
              {formatDate(created_at)}
            </Text>
          )}

          {status && (
            <Box
              className="notification-content"
              style={{ wordBreak: "break-word" }}
              dangerouslySetInnerHTML={{ __html: status.content }}
            />
          )}

          {type === "follow" && (
            <Text size="sm" c="dimmed">
              followed you
            </Text>
          )}

          {type === "follow_request" && (
            <Text size="sm" c="dimmed">
              requested to follow you
            </Text>
          )}
        </Stack>
      </Group>
    </Card>
  );
}
