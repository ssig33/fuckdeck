import { Card, Group, Avatar, Text, Stack, Box, Badge } from "@mantine/core";
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
    <Card p="sm" style={{ borderBottom: "1px solid #333" }} radius={0}>
      <Group gap="xs" mb="xs">
        <Text size="xs" c="dimmed">
          @{targetAccount.instance}
        </Text>
        <Badge size="xs" color={typeInfo.color} variant="light">
          {typeInfo.label}
        </Badge>
      </Group>

      <Group align="flex-start" gap="sm">
        <Avatar src={account.avatar} radius="xl" size="sm" />
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Text size="sm" fw={600}>
              {account.display_name || account.username}
            </Text>
            <Text size="xs" c="dimmed">
              @{account.acct}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {formatDate(created_at)}
          </Text>

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
