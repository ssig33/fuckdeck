import "@mantine/core/styles.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { AccountProvider } from "./hooks/useAccounts";
import { ColorSchemeProvider, useColorScheme } from "./contexts/ColorSchemeContext";
import { App } from "./App";

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "sm",
});

function AppWithTheme() {
  const { effectiveColorScheme } = useColorScheme();

  return (
    <MantineProvider theme={theme} forceColorScheme={effectiveColorScheme}>
      <AccountProvider>
        <App />
      </AccountProvider>
    </MantineProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ColorSchemeProvider>
        <AppWithTheme />
      </ColorSchemeProvider>
    </StrictMode>
  );
}
