import React from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MediaPreview } from "./MediaPreview";
import { UploadedMedia } from "../types";

// Mock window.matchMedia for Mantine
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

const renderWithMantine = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe("MediaPreview", () => {
  describe("when media array is empty", () => {
    it("renders no images", () => {
      renderWithMantine(<MediaPreview media={[]} onRemove={() => {}} />);

      const images = screen.queryAllByRole("img");
      expect(images).toHaveLength(0);
    });
  });

  describe("when media array has items", () => {
    const mockMedia: UploadedMedia[] = [
      {
        file: new File(["test"], "test1.png", { type: "image/png" }),
        previewUrl: "blob:test1",
        uploading: false,
      },
      {
        file: new File(["test"], "test2.png", { type: "image/png" }),
        previewUrl: "blob:test2",
        uploading: false,
      },
    ];

    it("renders preview images", () => {
      renderWithMantine(<MediaPreview media={mockMedia} onRemove={() => {}} />);

      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(2);
    });
  });

  describe("when media has error", () => {
    const errorMedia: UploadedMedia[] = [
      {
        file: new File(["test"], "test.png", { type: "image/png" }),
        previewUrl: "blob:test",
        uploading: false,
        error: "Upload failed",
      },
    ];

    it("shows error text", () => {
      renderWithMantine(
        <MediaPreview media={errorMedia} onRemove={() => {}} />
      );

      const errorText = screen.getByText("Error");
      expect(errorText).toBeDefined();
    });
  });
});
