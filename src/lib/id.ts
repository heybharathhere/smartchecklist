/** Sortable, collision-resistant id: time prefix + random suffix. */
export function uid(prefix = ''): string {
  const time = Date.now().toString(36);
  const rand =
    typeof crypto !== 'undefined' && 'getRandomValues' in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((n) => n.toString(36).padStart(2, '0'))
          .join('')
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}${time}${rand}`;
}
