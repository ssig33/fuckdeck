import { Group, Title, Button } from "@mantine/core";

interface HeaderProps {
  onAddAccount: () => void;
}

export function Header({ onAddAccount }: HeaderProps) {
  return (
    <Group justify="space-between" p="md" style={{ borderBottom: "1px solid #333" }}>
      <Title order={3}>FuckDeck</Title>
      <Button onClick={onAddAccount} size="sm">
        Add Account
      </Button>
    </Group>
  );
}
