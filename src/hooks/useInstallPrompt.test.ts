import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useInstallPrompt } from "./useInstallPrompt";

function makePromptEvent() {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  return Object.assign(event, {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
}

describe("useInstallPrompt", () => {
  afterEach(() => {
    cleanup();
  });

  it("is unavailable until the browser offers installation", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current).toBeNull();
  });

  it("keeps the browser's own prompt back and shows it on request, once", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = makePromptEvent();

    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(result.current).not.toBeNull();

    await act(async () => {
      await result.current!();
    });

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(result.current).toBeNull();
  });

  it("becomes unavailable once the app is installed", () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(result.current).toBeNull();
  });
});
