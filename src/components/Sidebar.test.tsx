import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { useState } from "react";
import { Sidebar } from "./Sidebar";

// A stand-in that holds a draft in its own state, like the real form does.
vi.mock("./ComposeForm", () => ({
  ComposeForm: () => {
    const [draft, setDraft] = useState("");
    return (
      <textarea
        placeholder="What's on your mind?"
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
      />
    );
  },
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const renderSidebar = () =>
  render(
    <MantineProvider>
      <Sidebar />
    </MantineProvider>
  );

const composeBox = () => screen.getByPlaceholderText("What's on your mind?");

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("starts open", () => {
    renderSidebar();

    expect(screen.getByRole("button", { name: "Close compose" })).toBeTruthy();
    expect(composeBox()).toBeTruthy();
  });

  it("stays collapsed after a reload", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Close compose" }));
    cleanup();

    renderSidebar();

    expect(screen.getByRole("button", { name: "Open compose" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close compose" })).toBeNull();
  });

  it("keeps the draft while collapsed", () => {
    renderSidebar();
    fireEvent.change(composeBox(), { target: { value: "half-written post" } });

    fireEvent.click(screen.getByRole("button", { name: "Close compose" }));
    fireEvent.click(screen.getByRole("button", { name: "Open compose" }));

    expect((composeBox() as HTMLTextAreaElement).value).toBe("half-written post");
  });
});
