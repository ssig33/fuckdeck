/**
 * HTML コンテンツから Gyazo ID を抽出する
 */
export function extractGyazoIds(htmlContent: string): string[] {
  const ids = new Set<string>();

  // i.gyazo.com の直接画像URL: https://i.gyazo.com/[id].png (または .jpg, .gif, .webp)
  const directImageRegex = /https:\/\/i\.gyazo\.com\/([a-f0-9]+)\.(png|jpg|gif|webp)/gi;
  let match;
  while ((match = directImageRegex.exec(htmlContent)) !== null) {
    ids.add(match[1]);
  }

  // gyazo.com のページURL: https://gyazo.com/[id]
  const pageUrlRegex = /https:\/\/gyazo\.com\/([a-f0-9]+)(?![a-f0-9])/gi;
  while ((match = pageUrlRegex.exec(htmlContent)) !== null) {
    ids.add(match[1]);
  }

  return Array.from(ids);
}
