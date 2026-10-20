import { describe, expect, it } from "vitest";
import {
  convertImport,
  getImportKind,
  ImportError,
  markdownToHtml,
  sanitizeImportedHtml,
  textToHtml,
  titleFromFileName,
} from "./import";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("textToHtml (.txt)", () => {
  it("makes one paragraph per blank-line-separated block", () => {
    expect(textToHtml("First\n\nSecond\r\n\r\n\r\nThird")).toBe("<p>First</p><p>Second</p><p>Third</p>");
  });

  it("keeps single line breaks inside a paragraph", () => {
    expect(textToHtml("line one\nline two")).toBe("<p>line one<br>line two</p>");
  });

  it("escapes HTML so markup is shown as text", () => {
    const html = textToHtml(`<script>alert("x")</script> & <b>bold</b>`);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).toBe("<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt;</p>");
  });

  it("returns nothing for whitespace-only text", () => expect(textToHtml(" \n\n \n")).toBe(""));
});

describe("markdownToHtml (.md)", () => {
  it("converts headings", () => {
    const html = markdownToHtml("# Title\n\n## Section");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<h2>Section</h2>");
  });

  it("converts bullet and numbered lists", () => {
    const html = markdownToHtml("- one\n- two\n\n1. first\n2. second");
    expect(html).toMatch(/<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
    expect(html).toMatch(/<ol>\s*<li>first<\/li>\s*<li>second<\/li>\s*<\/ol>/);
  });

  it("strips scripts and event handlers written as raw HTML", () => {
    const html = markdownToHtml(`# Hi\n\n<script>alert(1)</script>\n\n<p onclick="evil()">text</p>`);
    expect(html).not.toMatch(/script|alert|onclick/i);
    expect(html).toContain("<p>text</p>");
  });
});

describe("sanitizeImportedHtml", () => {
  it("removes <script> and <style> together with their contents", () => {
    const html = sanitizeImportedHtml(
      "<p>keep</p><script>alert(1)</script><style>body{display:none}</style>",
    );
    expect(html).toBe("<p>keep</p>");
  });

  it("removes event-handler attributes", () => {
    const html = sanitizeImportedHtml(`<p onmouseover="x()">hi</p><a href="https://a.test" onclick="y()">link</a>`);
    expect(html).toBe(`<p>hi</p><a href="https://a.test">link</a>`);
  });

  it("removes javascript: links and images", () => {
    const html = sanitizeImportedHtml(`<a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">`);
    expect(html).not.toMatch(/javascript|onerror|<img/i);
  });
});

describe("file names", () => {
  it("detects the supported types case-insensitively", () => {
    expect(getImportKind("notes.TXT")).toBe("txt");
    expect(getImportKind("readme.md")).toBe("md");
    expect(getImportKind("report.docx")).toBe("docx");
    expect(getImportKind("report.pdf")).toBeNull();
    expect(getImportKind("noextension")).toBeNull();
  });

  it("titles the document from the file name without its extension", () => {
    expect(titleFromFileName("Q3 plan.final.docx")).toBe("Q3 plan.final");
    expect(titleFromFileName("C:\\docs\\notes.txt")).toBe("notes");
    expect(titleFromFileName(".txt")).toBe("Imported document");
  });
});

describe("convertImport", () => {
  it("converts a .txt file and titles it from the file name", async () => {
    const result = await convertImport({ name: "meeting notes.txt", bytes: bytes("a\n\nb") });
    expect(result).toEqual({ title: "meeting notes", html: "<p>a</p><p>b</p>" });
  });

  const rejects = (file: { name: string; bytes: Uint8Array }, status: number) =>
    expect(convertImport(file)).rejects.toMatchObject({ name: "ImportError", status });

  it("rejects unsupported types with 415", () => rejects({ name: "a.pdf", bytes: bytes("x") }, 415));
  it("rejects files over 2 MB with 413", () =>
    rejects({ name: "a.txt", bytes: new Uint8Array(2 * 1024 * 1024 + 1) }, 413));
  it("rejects empty files with 400", () => rejects({ name: "a.txt", bytes: new Uint8Array() }, 400));
  it("rejects whitespace-only files with 400", () => rejects({ name: "a.md", bytes: bytes("  \n ") }, 400));
  it("rejects unreadable .docx files with 422", () => rejects({ name: "a.docx", bytes: bytes("not a zip") }, 422));

  it("throws ImportError instances", async () => {
    await expect(convertImport({ name: "a.pdf", bytes: bytes("x") })).rejects.toBeInstanceOf(ImportError);
  });
});
