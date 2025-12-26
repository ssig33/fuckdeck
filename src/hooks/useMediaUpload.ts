import { useState, useRef } from "react";
import { UploadedMedia } from "../types";
import { uploadMedia } from "../utils/mastodon";

const DEFAULT_MAX_MEDIA = 4;

interface UseMediaUploadOptions {
  instance: string;
  accessToken: string;
  maxMedia?: number;
}

interface UseMediaUploadResult {
  media: UploadedMedia[];
  isUploading: boolean;
  hasError: boolean;
  canAddMore: boolean;
  addFiles: (files: File[]) => void;
  removeMedia: (previewUrl: string) => void;
  clearAll: () => void;
  getMediaIds: () => string[];
  resetRef: React.RefObject<(() => void) | null>;
}

export function useMediaUpload({
  instance,
  accessToken,
  maxMedia = DEFAULT_MAX_MEDIA,
}: UseMediaUploadOptions): UseMediaUploadResult {
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const resetRef = useRef<(() => void) | null>(null);

  const isUploading = media.some((m) => m.uploading);
  const hasError = media.some((m) => m.error);
  const canAddMore = media.length < maxMedia;

  const addFiles = async (files: File[]) => {
    if (!instance || !accessToken) return;

    const remainingSlots = maxMedia - media.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length === 0) return;

    const newMedia: UploadedMedia[] = filesToAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }));

    setMedia((prev) => [...prev, ...newMedia]);

    for (const mediaItem of newMedia) {
      try {
        const attachment = await uploadMedia(instance, accessToken, mediaItem.file);
        setMedia((prev) =>
          prev.map((m) =>
            m.previewUrl === mediaItem.previewUrl
              ? { ...m, attachment, uploading: false }
              : m
          )
        );
      } catch (err) {
        setMedia((prev) =>
          prev.map((m) =>
            m.previewUrl === mediaItem.previewUrl
              ? {
                  ...m,
                  uploading: false,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : m
          )
        );
      }
    }

    resetRef.current?.();
  };

  const removeMedia = (previewUrl: string) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.previewUrl === previewUrl);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((m) => m.previewUrl !== previewUrl);
    });
  };

  const clearAll = () => {
    media.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    setMedia([]);
  };

  const getMediaIds = (): string[] => {
    return media.filter((m) => m.attachment).map((m) => m.attachment!.id);
  };

  return {
    media,
    isUploading,
    hasError,
    canAddMore,
    addFiles,
    removeMedia,
    clearAll,
    getMediaIds,
    resetRef,
  };
}
