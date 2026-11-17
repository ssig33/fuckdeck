import { useState } from "react";
import { Modal, TextInput, Button, Stack, Text } from "@mantine/core";
import { useAccounts } from "../hooks/useAccounts";
import { registerApp, getAuthorizationUrl } from "../utils/mastodon";
import { getMiAuthUrl } from "../utils/misskey";
import { detectPlatform } from "../utils/api";

interface LoginModalProps {
  opened: boolean;
  onClose: () => void;
}

export function LoginModal({ opened, onClose }: LoginModalProps) {
  const [instance, setInstance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setPendingAuth } = useAccounts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInstance = instance.trim().replace(/^https?:\/\//, "");

    if (!trimmedInstance) {
      setError("Instance URL is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if ((await detectPlatform(trimmedInstance)) === "misskey") {
        const session = crypto.randomUUID();
        setPendingAuth({
          platform: "misskey",
          instance: trimmedInstance,
          clientId: "",
          clientSecret: "",
          session,
        });
        window.location.href = getMiAuthUrl(trimmedInstance, session);
        return;
      }

      const credentials = await registerApp(trimmedInstance);

      setPendingAuth({
        instance: trimmedInstance,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
      });

      const authUrl = getAuthorizationUrl(trimmedInstance, credentials.clientId);
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Account">
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Instance URL"
            placeholder="mastodon.social or misskey.io"
            value={instance}
            onChange={(e) => setInstance(e.currentTarget.value)}
            disabled={loading}
          />
          {error && <Text c="red" size="sm">{error}</Text>}
          <Button type="submit" loading={loading}>
            Login
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
