import { useEffect, useState } from "react";
import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAccounts } from "./hooks/useAccounts";
import { Header } from "./components/Header";
import { LoginModal } from "./components/LoginModal";
import { ColumnLayout } from "./components/ColumnLayout";
import { Sidebar } from "./components/Sidebar";
import {
  getShowUnifiedLocalTimeline,
  getShowUnifiedTimeline,
  saveShowUnifiedLocalTimeline,
  saveShowUnifiedTimeline,
} from "./utils/storage";
import { exchangeToken, verifyCredentials } from "./utils/mastodon";
import { checkMiAuth } from "./utils/misskey";
import { getInstanceLimits } from "./utils/api";
import { Account, PendingAuth } from "./types";

/** Finishes the login that `pendingAuth` started, from the callback query. */
async function completeLogin(
  pendingAuth: PendingAuth,
  params: URLSearchParams
): Promise<Account | null> {
  const base = {
    id: crypto.randomUUID(),
    instance: pendingAuth.instance,
    clientId: pendingAuth.clientId,
    clientSecret: pendingAuth.clientSecret,
  };

  if (pendingAuth.platform === "misskey") {
    const session = params.get("session");
    if (!session || session !== pendingAuth.session) return null;
    const { token, user } = await checkMiAuth(pendingAuth.instance, session);
    const limits = await getInstanceLimits({ instance: pendingAuth.instance, platform: "misskey" });
    return { ...base, platform: "misskey", accessToken: token, user, limits };
  }

  const code = params.get("code");
  if (!code) return null;
  const token = await exchangeToken(
    pendingAuth.instance,
    pendingAuth.clientId,
    pendingAuth.clientSecret,
    code
  );
  const user = await verifyCredentials(pendingAuth.instance, token);
  const limits = await getInstanceLimits({ instance: pendingAuth.instance });
  return { ...base, platform: "mastodon", accessToken: token, user, limits };
}

export function App() {
  const [loginOpened, { open: openLogin, close: closeLogin }] = useDisclosure(false);
  const { pendingAuth, setPendingAuth, addAccount } = useAccounts();
  const [processing, setProcessing] = useState(false);
  const [showUnifiedTimeline, setShowUnifiedTimelineState] = useState(getShowUnifiedTimeline);

  const setShowUnifiedTimeline = (show: boolean) => {
    setShowUnifiedTimelineState(show);
    saveShowUnifiedTimeline(show);
  };
  const [showUnifiedLocalTimeline, setShowUnifiedLocalTimelineState] = useState(
    getShowUnifiedLocalTimeline
  );

  const setShowUnifiedLocalTimeline = (show: boolean) => {
    setShowUnifiedLocalTimelineState(show);
    saveShowUnifiedLocalTimeline(show);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasCallback = params.has("code") || params.has("session");

    if (hasCallback && pendingAuth && !processing) {
      setProcessing(true);

      history.replaceState(null, "", window.location.pathname);

      (async () => {
        try {
          const account = await completeLogin(pendingAuth, params);
          if (account) {
            addAccount(account);
          }
        } catch (err) {
          console.error("Login callback failed:", err);
        } finally {
          setPendingAuth(null);
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
        showUnifiedLocalTimeline={showUnifiedLocalTimeline}
        onShowUnifiedLocalTimelineChange={setShowUnifiedLocalTimeline}
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
        <ColumnLayout
          showUnifiedTimeline={showUnifiedTimeline}
          showUnifiedLocalTimeline={showUnifiedLocalTimeline}
        />
      </Box>
      <LoginModal opened={loginOpened} onClose={closeLogin} />
    </Box>
  );
}
