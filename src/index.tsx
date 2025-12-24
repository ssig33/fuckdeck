import "@mantine/core/styles.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { AccountProvider } from "./hooks/useAccounts";
import { App } from "./App";

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "sm",
});

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <AccountProvider>
          <App />
        </AccountProvider>
      </MantineProvider>
    </StrictMode>
  );
}
