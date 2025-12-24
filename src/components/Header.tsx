import { Group, Title, Button, Anchor } from "@mantine/core";

interface HeaderProps {
  onAddAccount: () => void;
}

export function Header({ onAddAccount }: HeaderProps) {
  return (
    <Group justify="space-between" p="md" style={{ borderBottom: "1px solid #333" }}>
      <Group gap="md">
        <Title order={3}>FuckDeck</Title>
        <Anchor
          href="https://github.com/ssig33/fuckdeck"
          target="_blank"
          size="sm"
          c="dimmed"
        >
          GitHub
        </Anchor>
      </Group>
      <Button onClick={onAddAccount} size="sm">
        Add Account
      </Button>
    </Group>
  );
}
