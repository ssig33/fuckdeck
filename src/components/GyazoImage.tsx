import { useState } from "react";
import { Image, Anchor } from "@mantine/core";

const EXTENSIONS = ["png", "jpg", "gif", "webp"] as const;

interface GyazoImageProps {
  gyazoId: string;
}

export function GyazoImage({ gyazoId }: GyazoImageProps) {
  const [extensionIndex, setExtensionIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  const extension = EXTENSIONS[extensionIndex];
  const url = `https://i.gyazo.com/${gyazoId}.${extension}`;

  const handleError = () => {
    if (extensionIndex < EXTENSIONS.length - 1) {
      setExtensionIndex(extensionIndex + 1);
    } else {
      setFailed(true);
    }
  };

  return (
    <Anchor href={url} target="_blank" rel="noopener noreferrer">
      <Image
        src={url}
        alt="Gyazo image"
        w={100}
        h={100}
        fit="cover"
        radius="sm"
        style={{ cursor: "pointer" }}
        onError={handleError}
      />
    </Anchor>
  );
}
