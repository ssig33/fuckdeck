import { describe, it, expect } from "vitest";
import { extractGyazoIds } from "./gyazo";

describe("extractGyazoIds", () => {
  it("returns empty array when no Gyazo URLs exist", () => {
    const html = "<p>Hello, world!</p>";
    expect(extractGyazoIds(html)).toEqual([]);
  });

  it("extracts ID from direct image URL (i.gyazo.com)", () => {
    const html = '<p>Check this out: <a href="https://i.gyazo.com/abc123def456.png">image</a></p>';
    expect(extractGyazoIds(html)).toEqual(["abc123def456"]);
  });

  it("extracts ID from page URL (gyazo.com)", () => {
    const html = '<p>See: <a href="https://gyazo.com/abc123def456">link</a></p>';
    expect(extractGyazoIds(html)).toEqual(["abc123def456"]);
  });

  it("extracts multiple Gyazo IDs", () => {
    const html = `
      <p>Image 1: <a href="https://gyazo.com/aaa111">link1</a></p>
      <p>Image 2: <a href="https://i.gyazo.com/bbb222.png">link2</a></p>
      <p>Image 3: <a href="https://gyazo.com/ccc333">link3</a></p>
    `;
    const ids = extractGyazoIds(html);
    expect(ids).toHaveLength(3);
    expect(ids).toContain("aaa111");
    expect(ids).toContain("bbb222");
    expect(ids).toContain("ccc333");
  });

  it("handles jpg, gif, and webp extensions", () => {
    const html = `
      <a href="https://i.gyazo.com/abc123.jpg">jpg</a>
      <a href="https://i.gyazo.com/def456.gif">gif</a>
      <a href="https://i.gyazo.com/aaa789.webp">webp</a>
    `;
    const ids = extractGyazoIds(html);
    expect(ids).toHaveLength(3);
    expect(ids).toContain("abc123");
    expect(ids).toContain("def456");
    expect(ids).toContain("aaa789");
  });

  it("does not duplicate IDs when both page and image URLs point to same image", () => {
    const html = `
      <a href="https://gyazo.com/abc123">page</a>
      <a href="https://i.gyazo.com/abc123.png">image</a>
    `;
    const ids = extractGyazoIds(html);
    expect(ids).toEqual(["abc123"]);
  });

  it("ignores non-Gyazo URLs", () => {
    const html = `
      <a href="https://example.com/image.png">not gyazo</a>
      <a href="https://gyazo.com/abc123">gyazo</a>
      <a href="https://twitter.com/photo">twitter</a>
    `;
    expect(extractGyazoIds(html)).toEqual(["abc123"]);
  });
});
