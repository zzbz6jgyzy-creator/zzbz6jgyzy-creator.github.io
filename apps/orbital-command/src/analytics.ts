/** Privacy-preserving events. No coordinates, no search text. Uses the site allowlist when present. */
export function track(name: string): void {
  const fn = (window as Window & { sdTrack?: (n: string) => void }).sdTrack;
  if (typeof fn === "function") fn(name);
}
