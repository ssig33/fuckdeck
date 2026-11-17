import { useEffect, useState } from "react";
import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAccounts } from "./hooks/useAccounts";
import { Header } from "./components/Header";
import { LoginModal } from "./components/LoginModal";
import { ColumnLayout } from "./components/ColumnLayout";
import { Sidebar } from "./components/Sidebar";
import { getShowUnifiedTimeline, saveShowUnifiedTimeline } from "./utils/storage";
import {
  exchangeToken,
  getInstanceLimits,
  verifyCredentials,
} from "./utils/mastodon";

export function App() {
  const [loginOpened, { open: openLogin, close: closeLogin }] = useDisclosure(false);
  const { pendingAuth, setPendingAuth, addAccount } = useAccounts();
  const [processing, setProcessing] = useState(false);
  const [showUnifiedTimeline, setShowUnifiedTimelineState] = useState(getShowUnifiedTimeline);

  const setShowUnifiedTimeline = (show: boolean) => {
    setShowUnifiedTimelineState(show);
    saveShowUnifiedTimeline(show);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code && pendingAuth && !processing) {
      setProcessing(true);

      history.replaceState(null, "", window.location.pathname);

      (async () => {
        try {
          const token = await exchangeToken(
            pendingAuth.instance,
            pendingAuth.clientId,
            pendingAuth.clientSecret,
            code
          );

          const user = await verifyCredentials(pendingAuth.instance, token);
          const limits = await getInstanceLimits(pendingAuth.instance);

          addAccount({
            id: crypto.randomUUID(),
            instance: pendingAuth.instance,
            accessToken: token,
            clientId: pendingAuth.clientId,
            clientSecret: pendingAuth.clientSecret,
            user,
            limits,
          });

          setPendingAuth(null);
        } catch (err) {
          console.error("OAuth callback failed:", err);
          setPendingAuth(null);
        } finally {
          setProcessing(false);
        }
      })();
    }
  }, [pendingAuth, addAccount, setPendingAuth, processing]);

  return (
    <Box
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--mantine-color-body)",
      }}
    >
      <Header
        onAddAccount={openLogin}
        showUnifiedTimeline={showUnifiedTimeline}
        onShowUnifiedTimelineChange={setShowUnifiedTimeline}
      />
      <Box
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        <Sidebar />
        <ColumnLayout showUnifiedTimeline={showUnifiedTimeline} />
      </Box>
      <LoginModal opened={loginOpened} onClose={closeLogin} />
    </Box>
  );
}
