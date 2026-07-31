/** Client-safe helpers shared by the sign-in page and the admin console. */

export const SUPER_ADMIN_USERNAME = "avanthi";
export const SUPER_ADMIN_EMAIL = "avanthi@crtconsole.app";

/** Reserved usernames that are not email addresses map to a fixed internal address. */
const USERNAME_ALIASES: Record<string, string> = {
  [SUPER_ADMIN_USERNAME]: SUPER_ADMIN_EMAIL,
};

/** Turn whatever the user typed in the "Username or email" box into an email. */
export function resolveLoginEmail(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (value.includes("@")) return value.toLowerCase();
  return USERNAME_ALIASES[value.toLowerCase()] ?? value.toLowerCase();
}

export const DEFAULT_DOMAIN = "gmail.com";

export function normaliseRoll(roll: string): string {
  return roll.trim().toUpperCase().replace(/\s+/g, "");
}

export function rollToEmail(roll: string, domain: string): string {
  return `${normaliseRoll(roll).toLowerCase()}@${domain.trim().toLowerCase().replace(/^@/, "")}`;
}

/** Expand a prefix + numeric range into roll numbers, e.g. 23Q61A05 / 1..60 / pad 2. */
export function expandRange(prefix: string, start: number, end: number, pad: number): string[] {
  const rolls: string[] = [];
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  for (let n = from; n <= to; n++) {
    rolls.push(`${normaliseRoll(prefix)}${String(n).padStart(Math.max(1, pad), "0")}`);
  }
  return rolls;
}

/** Split a pasted blob of roll numbers on commas, spaces and newlines. */
export function parseRollList(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\s,;]+/)
        .map(normaliseRoll)
        .filter(Boolean),
    ),
  );
}

export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain.trim().replace(/^@/, ""));
}

export function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
