/**
 * Escapes a value for safe embedding inside a `<script type="application/ld+json">` block.
 *
 * `</script>` inside a JSON string would close the tag early (script breakout),
 * so every `<` is escaped to `\u003c` — JSON-valid and parsed back identically.
 */
export function safeJsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
