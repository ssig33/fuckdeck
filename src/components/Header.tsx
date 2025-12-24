import { Group, Title, Button, Anchor, SegmentedControl } from "@mantine/core";
import { useColorScheme } from "../contexts/ColorSchemeContext";

interface HeaderProps {
  onAddAccount: () => void;
}

export function Header({ onAddAccount }: HeaderProps) {
  const { preference, setPreference } = useColorScheme();

  return (
    <Group justify="space-between" p="md" style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))" }}>
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
      <Group gap="sm">
        <SegmentedControl
          value={preference}
          onChange={(value) => setPreference(value as "auto" | "light" | "dark")}
          data={[
            { label: "🌐 Auto", value: "auto" },
            { label: "☀️ Light", value: "light" },
            { label: "🌙 Dark", value: "dark" },
          ]}
          size="xs"
        />
        <Button onClick={onAddAccount} size="sm">
          Add Account
        </Button>
      </Group>
    </Group>
  );
}
