/**
 * Tests untuk email sanitization functions di src/lib/email.ts
 *
 * Functions yang ditest:
 * - sanitizeEmailHeader: strip newline, tab, < > untuk prevent header injection
 * - escapeHtml: full HTML escape + newline → space untuk body HTML
 * - escapeHtmlBody: full HTML escape, preserve newline untuk <pre> content
 * - isValidInvoiceUrl: new URL() validation dengan protocol check
 *
 * Note: Functions ini private di email.ts, jadi kita test behavior via exported functions
 * atau dengan cara extract logic ke utility file yang testable.
 *
 * Untuk sekarang, kita test logic secara isolated dengan mengimport utils yang sama.
 */

import { describe, expect, it } from "vitest";

// ============================================================
// Inline implementations untuk test (mirror dari email.ts)
// Ketika functions ini di-export dari email.ts, update imports ini
// ============================================================

function sanitizeEmailHeader(str: string): string {
  return str.replace(/[\r\n\t<>]+/g, ' ').trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/[\r\n]+/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeHtmlBody(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isValidInvoiceUrl(invoiceUrl: string, isDev = false): boolean {
  try {
    if (/[\r\n]/.test(invoiceUrl)) return false;
    const url = new URL(invoiceUrl);
    return url.protocol === "https:" || (isDev && url.protocol === "http:");
  } catch {
    return false;
  }
}

// ============================================================

describe("sanitizeEmailHeader", () => {
  it("should pass through clean strings unchanged", () => {
    expect(sanitizeEmailHeader("Hafi Studio")).toBe("Hafi Studio");
    expect(sanitizeEmailHeader("BK-2024-001")).toBe("BK-2024-001");
  });

  it("should strip newline characters (prevent header injection)", () => {
    expect(sanitizeEmailHeader("Subject\r\nBcc: attacker@evil.com")).not.toContain("\r\n");
    expect(sanitizeEmailHeader("Name\nInjected: header")).not.toContain("\n");
    expect(sanitizeEmailHeader("Name\rInjected")).not.toContain("\r");
  });

  it("should strip tab characters", () => {
    expect(sanitizeEmailHeader("Name\tTabbed")).not.toContain("\t");
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
    expect(result).not.toMatch(/\r|\n|\t/);
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
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it("should replace newlines with space (not remove)", () => {
    const result = escapeHtml("line1\nline2");
    expect(result).toBe("line1 line2");
    expect(result).not.toContain("\n");
  });

  it("should collapse multiple consecutive newlines to single space", () => {
    // [\r\n]+ with + quantifier — all consecutive newlines become ONE space
    const result = escapeHtml("line1\r\n\r\nline3");
    expect(result).toBe("line1 line3"); // \r\n\r\n → one space (+ quantifier)
  });

  it("should escape HTML tags to prevent XSS (< > become entities)", () => {
    const xss = '<img src="x" onerror="alert(1)">';
    const result = escapeHtml(xss);
    // < and > are escaped to &lt; and &gt;, making HTML non-executable
    expect(result).not.toContain("<img");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    // onerror attribute still present as text but is harmless (tags escaped)
    expect(result).toContain("&lt;img");
    expect(result).toContain("&gt;");
  });
});

describe("escapeHtmlBody", () => {
  it("should escape HTML special characters", () => {
    expect(escapeHtmlBody("Hafi & Co")).toBe("Hafi &amp; Co");
    expect(escapeHtmlBody("<script>")).toBe("&lt;script&gt;");
  });

  it("should PRESERVE newlines (unlike escapeHtml)", () => {
    const input = "BCA\n1234567890\nHafi Studio";
    const result = escapeHtmlBody(input);
    expect(result).toContain("\n");
    expect(result).toBe("BCA\n1234567890\nHafi Studio");
  });

  it("should preserve multi-line rekening bank format", () => {
    const rekening = "Bank BCA\nNo: 1234567890\nA/N: Hafi Studio";
    const result = escapeHtmlBody(rekening);
    // Newlines preserved for <pre> tag formatting
    expect(result.split("\n")).toHaveLength(3);
  });
});

describe("isValidInvoiceUrl", () => {
  describe("production mode (https only)", () => {
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
    it("should accept http://localhost in dev mode", () => {
      expect(isValidInvoiceUrl("http://localhost:3000/invoice/123", true)).toBe(true);
    });

    it("should accept https in dev mode too", () => {
      expect(isValidInvoiceUrl("https://hafiportrait.com/invoice/123", true)).toBe(true);
    });

    it("should still reject javascript: in dev mode", () => {
      expect(isValidInvoiceUrl("javascript:alert(1)", true)).toBe(false);
    });

    it("should still reject newlines in dev mode", () => {
      expect(isValidInvoiceUrl("http://localhost\r\nBcc: evil", true)).toBe(false);
    });
  });
});
