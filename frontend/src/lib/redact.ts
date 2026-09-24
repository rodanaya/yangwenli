// RFC redaction (.claude/rules/security.md § 1 — RFCs are PII and are never
// exposed). ARIA memos carry a preamble like "RFC: XXX000000XX0 | Vendor ID: 1":
// the labelled segment is dropped; any bare RFC-shaped token left anywhere in
// the text is masked to its first three letters.
const RFC_LABELLED = /\bR\.?F\.?C\.?\s*[:=]?\s*[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b\s*(\|\s*)?/g
const RFC_TOKEN = /\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/g

export function redactRfc(text: string): string {
  return text
    .replace(RFC_LABELLED, '')
    .replace(RFC_TOKEN, (m) => `${m.slice(0, 3)}···`)
    .replace(/^[ \t]*\|[ \t]*/gm, '')
}
