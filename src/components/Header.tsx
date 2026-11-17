import { Group, Title, Button, Anchor, SegmentedControl, Switch } from "@mantine/core";
import { useColorScheme } from "../contexts/ColorSchemeContext";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

interface HeaderProps {
  onAddAccount: () => void;
  showUnifiedTimeline: boolean;
  onShowUnifiedTimelineChange: (show: boolean) => void;
  showUnifiedLocalTimeline: boolean;
  onShowUnifiedLocalTimelineChange: (show: boolean) => void;
}

export function Header({
  onAddAccount,
  showUnifiedTimeline,
  onShowUnifiedTimelineChange,
  showUnifiedLocalTimeline,
  onShowUnifiedLocalTimelineChange,
}: HeaderProps) {
  const { preference, setPreference } = useColorScheme();
  const install = useInstallPrompt();

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
        <Switch
          label="Unified timeline"
          size="xs"
          checked={showUnifiedTimeline}
          onChange={(event) => onShowUnifiedTimelineChange(event.currentTarget.checked)}
        />
        <Switch
          label="Unified local timeline"
          size="xs"
          checked={showUnifiedLocalTimeline}
          onChange={(event) =>
            onShowUnifiedLocalTimelineChange(event.currentTarget.checked)
          }
        />
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
        {install && (
          <Button onClick={install} size="sm" variant="light">
            Install app
          </Button>
        )}
        <Button onClick={onAddAccount} size="sm">
          Add Account
        </Button>
      </Group>
    </Group>
  );
}
