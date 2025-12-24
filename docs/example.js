// FuckPost - A minimal Mastodon client
// Main application logic

// Constants
const STORAGE_KEY = "fuckpost_data";
const DEFAULT_STORAGE = {
  draft: {
    content: "",
    updated: null,
  },
  settings: {
    previewMode: "vertical",
  },
};

// App configuration
const APP_NAME = "FuckPost";
const APP_WEBSITE = window.location.origin;
const APP_REDIRECT_URI = window.location.href.split("?")[0];
const APP_SCOPES = "read write";

// App state
let appState = {
  instance: null,
  token: null,
  client_id: null,
  client_secret: null,
  storage: { ...DEFAULT_STORAGE },
};

// DOM Elements
const loginView = document.getElementById("login-view");
const editorView = document.getElementById("editor-view");
const loginForm = document.getElementById("login-form");
const instanceInput = document.getElementById("instance-url");
const accessTokenInput = document.getElementById("access-token");
const editorContainer = document.getElementById("editor-container");
const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const postButton = document.getElementById("post-button");
const logoutButton = document.getElementById("logout-button");
const viewModeRadios = document.querySelectorAll('input[name="view-mode"]');
const editorTab = document.getElementById("editor-tab");
const previewTab = document.getElementById("preview-tab");

// Initialize the application
function init() {
  // Check for existing authentication
  const savedToken = localStorage.getItem("fuckpost_token");
  const savedInstance = localStorage.getItem("fuckpost_instance");
  const savedClientId = localStorage.getItem("fuckpost_client_id");

  // Set up event listeners first to handle potential auth redirects
  setupEventListeners();

  if (savedToken && savedInstance) {
    appState.token = savedToken;
    appState.instance = savedInstance;
    if (savedClientId) {
      appState.client_id = savedClientId;
    }
    loadEditor();
  } else {
    showLoginView();
  }
}

// Set up event listeners
function setupEventListeners() {
  // Login form submission
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const instance = instanceInput.value.trim();

    if (instance) {
      // Store the instance
      appState.instance = instance;
      localStorage.setItem("fuckpost_instance", instance);

      // Register the application with the instance
      registerApplication(instance);
    }
  });

  // Editor input for real-time preview
  editor.addEventListener("input", updatePreview);

  // Post button
  postButton.addEventListener("click", submitPost);

  // View mode toggle
  viewModeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      setViewMode(e.target.value);
    });
  });

  // Logout button
  logoutButton.addEventListener("click", logout);

  // Check for access token in URL fragment after redirect
  window.addEventListener("load", checkForAccessToken);
}

// Logout function - clear localStorage and reload the page
function logout() {
  // Clear all FuckPost related items from localStorage
  localStorage.removeItem("fuckpost_token");
  localStorage.removeItem("fuckpost_instance");
  localStorage.removeItem("fuckpost_client_id");
  localStorage.removeItem("fuckpost_client_secret");
  localStorage.removeItem(STORAGE_KEY);

  // Reload the page to reset the application state
  window.location.reload();
}

// Register the application with the Mastodon instance
async function registerApplication(instance) {
  try {
    const response = await fetch(`https://${instance}/api/v1/apps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_name: APP_NAME,
        redirect_uris: APP_REDIRECT_URI,
        scopes: APP_SCOPES,
        website: APP_WEBSITE,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    console.log("Application registered:", data);

    // Store the client_id and client_secret
    appState.client_id = data.client_id;
    appState.client_secret = data.client_secret;
    localStorage.setItem("fuckpost_client_id", data.client_id);
    localStorage.setItem("fuckpost_client_secret", data.client_secret);

    // Redirect to authorization page
    redirectToAuth(instance, data.client_id);
  } catch (error) {
    console.error("Error registering application:", error);
    alert(`Failed to register with instance: ${error.message}`);
  }
}

// Redirect to the Mastodon authorization page
function redirectToAuth(instance, clientId) {
  const authUrl = new URL(`https://${instance}/oauth/authorize`);

  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("redirect_uri", APP_REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", APP_SCOPES);

  window.location.href = authUrl.toString();
}

// Check for authorization code in URL query parameters after redirect
function checkForAccessToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  if (code) {
    // Exchange the code for an access token
    exchangeCodeForToken(code);

    // Clear the query parameters from the URL
    history.replaceState(null, null, window.location.pathname);
  }
}

// Exchange the authorization code for an access token
async function exchangeCodeForToken(code) {
  try {
    const instance =
      appState.instance || localStorage.getItem("fuckpost_instance");
    const clientId =
      appState.client_id || localStorage.getItem("fuckpost_client_id");
    const clientSecret =
      appState.client_secret || localStorage.getItem("fuckpost_client_secret");

    if (!instance || !clientId || !clientSecret) {
      throw new Error("Missing authentication information");
    }

    console.log("ikuzo");
    console.log(APP_REDIRECT_URI);
    const response = await fetch(`https://${instance}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: APP_REDIRECT_URI,
        grant_type: "authorization_code",
        code: code,
        scope: APP_SCOPES,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    console.log("Token exchange successful:", data);

    // Store the token
    appState.token = data.access_token;
    localStorage.setItem("fuckpost_token", data.access_token);

    // リロードして新しい認証情報で初期化
    window.location.reload();
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    alert(`Failed to get access token: ${error.message}`);
    showLoginView();
  }
}

// Show login view
function showLoginView() {
  loginView.style.display = "block";
  editorView.style.display = "none";

  // Pre-fill the form if we have saved values
  if (appState.instance) {
    instanceInput.value = appState.instance;
  }
  if (appState.token) {
    accessTokenInput.value = appState.token;
  }
}

// Load editor view
function loadEditor() {
  // Load saved draft from localStorage
  loadStorage();

  // Load the draft content
  loadDraft();

  // Set the view mode
  setViewMode(appState.storage.settings.previewMode);

  // Update the preview
  updatePreview();

  // Show the editor view
  loginView.style.display = "none";
  editorView.style.display = "block";
}

// Load storage from localStorage
function loadStorage() {
  const savedStorage = localStorage.getItem(STORAGE_KEY);
  if (savedStorage) {
    try {
      appState.storage = JSON.parse(savedStorage);

      // Ensure the storage has the expected structure
      if (!appState.storage.draft) {
        appState.storage.draft = DEFAULT_STORAGE.draft;
      }
      if (!appState.storage.settings) {
        appState.storage.settings = DEFAULT_STORAGE.settings;
      }
    } catch (e) {
      console.error("Failed to parse storage:", e);
      appState.storage = { ...DEFAULT_STORAGE };
    }
  } else {
    appState.storage = { ...DEFAULT_STORAGE };
  }
}

// Save storage to localStorage
function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.storage));
}

// Load the draft
function loadDraft() {
  if (appState.storage.draft && appState.storage.draft.content) {
    editor.value = appState.storage.draft.content;
  } else {
    editor.value = "";
  }
}

// Save the draft
function saveDraft() {
  const content = editor.value;
  appState.storage.draft.content = content;
  appState.storage.draft.updated = new Date().toISOString();
  saveStorage();
}

// Update the Markdown preview
function updatePreview() {
  const content = editor.value;
  preview.innerHTML = marked.parse(content);

  // Auto-save the draft
  saveDraft();
}

// Set the view mode (vertical or horizontal)
function setViewMode(mode) {
  if (mode === "vertical") {
    editorContainer.className = "vertical-mode";
  } else if (mode === "horizontal") {
    editorContainer.className = "horizontal-mode";
  }

  // Save the setting
  appState.storage.settings.previewMode = mode;
  saveStorage();
}

// Submit post to Mastodon
async function submitPost() {
  if (!appState.token || !appState.instance) {
    alert("Not authenticated. Please log in again.");
    showLoginView();
    return;
  }

  const content = editor.value;
  if (!content.trim()) {
    alert("Cannot post empty content.");
    return;
  }

  try {
    postButton.disabled = true;
    postButton.textContent = "Posting...";

    const response = await fetch(
      `https://${appState.instance}/api/v1/statuses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appState.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: content,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    // Post successful
    alert("Post successful!");

    // Clear the editor
    editor.value = "";
    updatePreview();
  } catch (error) {
    console.error("Error posting:", error);
    alert(`Failed to post: ${error.message}`);
  } finally {
    postButton.disabled = false;
    postButton.textContent = "Post";
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", init);
