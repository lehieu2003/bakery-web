/**
 * One stored form for a Vietnamese phone number — `0` + 9 digits — so the
 * same customer matches across orders whatever separators or country prefix
 * they typed. Callers validate the result with VN_PHONE_REGEX.
 */
export function normalizeVnPhone(phone: string): string {
  const compact = phone.replace(/[\s.-]/g, '');
  return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact;
}
