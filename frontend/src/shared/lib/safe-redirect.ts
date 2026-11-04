/** Only same-origin absolute paths survive; anything else falls back. Prevents open redirects. */
export function safeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  // URL parsers strip control characters, so "/\t/evil.com" would otherwise become "//evil.com".
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
