/**
 * Tests untuk email sanitization functions di src/lib/email.ts
 *
 * Functions yang ditest:
 * - sanitizeEmailHeader: strip newline, tab, < > untuk prevent header injection
 * - escapeHtml: full HTML escape + newline → space untuk body HTML
 * - escapeHtmlBody: full HTML escape, preserve newline untuk <pre> content
 * - isValidInvoiceUrl: new URL() validation dengan protocol check
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  escapeHtml,
  escapeHtmlBody,
  isValidInvoiceUrl,
  sanitizeEmailHeader,
} from "@/lib/email";

describe("sanitizeEmailHeader", () => {
  it("should pass through clean strings unchanged", () => {
    expect(sanitizeEmailHeader("Hafi Studio")).toBe("Hafi Studio");
    expect(sanitizeEmailHeader("BK-2024-001")).toBe("BK-2024-001");
  });

  it("should strip newline characters (prevent header injection)", () => {
    expect(sanitizeEmailHeader("Subject\r\nBcc: attacker@evil.com")).toBe("Subject Bcc: attacker@evil.com");
    expect(sanitizeEmailHeader("Name\nInjected: header")).toBe("Name Injected: header");
    expect(sanitizeEmailHeader("Name\rInjected")).toBe("Name Injected");
  });

  it("should strip tab characters", () => {
    expect(sanitizeEmailHeader("Name\tTabbed")).toBe("Name Tabbed");
  });

  it("should strip < and > to prevent header structure manipulation", () => {
    const input = "Hafi Studio <injected@evil.com>";
    const result = sanitizeEmailHeader(input);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("should preserve & in studio names (not HTML escaped)", () => {
    // email headers are plain text, NOT HTML
    const result = sanitizeEmailHeader("Hafi & Co Studio");
    expect(result).toBe("Hafi & Co Studio");
    expect(result).not.toContain("&amp;");
  });

  it("should trim leading and trailing whitespace", () => {
    expect(sanitizeEmailHeader("  Studio Name  ")).toBe("Studio Name");
  });

  it("should replace consecutive special chars with single space", () => {
    const result = sanitizeEmailHeader("Name\r\n\r\nInjected");
    expect(result).toBe("Name Injected");
  });
});

describe("escapeHtml", () => {
  it("should escape & to &amp;", () => {
    expect(escapeHtml("Hafi & Co")).toBe("Hafi &amp; Co");
  });

  it("should escape < to &lt;", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("should escape > to &gt;", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("should escape \" to &quot;", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("should escape ' to &#039;", () => {
    expect(escapeHtml("it's fine")).toBe("it&#039;s fine");
  });

  it("should replace newlines with space (not remove)", () => {
    expect(escapeHtml("line1\nline2")).toBe("line1 line2");
    expect(escapeHtml("line1\r\nline2")).toBe("line1 line2");
  });

  it("should collapse multiple consecutive newlines to single space", () => {
    expect(escapeHtml("line1\n\n\nline2")).toBe("line1 line2");
  });

  it("should escape HTML tags to prevent XSS (< > become entities)", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = escapeHtml(input);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
  });
});

describe("escapeHtmlBody", () => {
  it("should escape HTML special characters", () => {
    expect(escapeHtmlBody("<b>Bold</b>")).toBe("&lt;b&gt;Bold&lt;/b&gt;");
    expect(escapeHtmlBody("a & b")).toBe("a &amp; b");
  });

  it("should PRESERVE newlines (unlike escapeHtml)", () => {
    expect(escapeHtmlBody("line1\nline2")).toBe("line1\nline2");
    expect(escapeHtmlBody("line1\r\nline2")).toBe("line1\r\nline2");
  });

  it("should preserve multi-line rekening bank format", () => {
    const rekening = "BCA: 1234567890\nBNI: 9876543210";
    const result = escapeHtmlBody(rekening);
    expect(result).toBe("BCA: 1234567890\nBNI: 9876543210");
  });
});

describe("isValidInvoiceUrl", () => {
  describe("production mode (https only)", () => {
    const OLD_ENV = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    afterEach(() => {
      process.env.NODE_ENV = OLD_ENV;
    });

    it("should accept valid https URL", () => {
      expect(isValidInvoiceUrl("https://hafiportrait.com/invoice/123")).toBe(true);
    });

    it("should reject http URL in production", () => {
      expect(isValidInvoiceUrl("http://hafiportrait.com/invoice/123")).toBe(false);
    });

    it("should reject javascript: URL", () => {
      expect(isValidInvoiceUrl("javascript:alert(1)")).toBe(false);
    });

    it("should reject data: URL", () => {
      expect(isValidInvoiceUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    });

    it("should reject malformed URL", () => {
      expect(isValidInvoiceUrl("not-a-url")).toBe(false);
    });

    it("should reject https:// without domain (throws in new URL())", () => {
      expect(isValidInvoiceUrl("https://")).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidInvoiceUrl("")).toBe(false);
    });

    it("should reject URL with newline (header injection prevention)", () => {
      expect(isValidInvoiceUrl("https://hafiportrait.com/invoice\r\nBcc: attacker@evil.com")).toBe(false);
    });

    it("should reject URL with \\n", () => {
      expect(isValidInvoiceUrl("https://hafiportrait.com/\nBcc: evil")).toBe(false);
    });
  });

  describe("development mode (http allowed)", () => {
    const OLD_ENV = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    afterEach(() => {
      process.env.NODE_ENV = OLD_ENV;
    });

    it("should accept http://localhost in dev mode", () => {
      expect(isValidInvoiceUrl("http://localhost:3000/invoice/123")).toBe(true);
    });

    it("should accept https in dev mode too", () => {
      expect(isValidInvoiceUrl("https://hafiportrait.com/invoice/123")).toBe(true);
    });

    it("should still reject javascript: in dev mode", () => {
      expect(isValidInvoiceUrl("javascript:alert(1)")).toBe(false);
    });

    it("should still reject newlines in dev mode", () => {
      expect(isValidInvoiceUrl("http://localhost\r\nBcc: evil")).toBe(false);
    });
  });
});
