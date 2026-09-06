/**
 * Shared demo/test accounts.
 *
 * These credentials are published in the README so anyone can try the app, so
 * their identity (name, email) and password must stay fixed — otherwise the
 * first visitor who edits them locks everybody else out.
 *
 * Override the list with the DEMO_ACCOUNT_EMAILS env var (comma separated).
 */
const DEFAULT_DEMO_EMAILS = ['admin@gmail.com', 'employee@gmail.com'];

export const DEMO_LOCK_MESSAGE =
  'This is a shared demo account — its name, email and password are locked so everyone can keep signing in.';

export const DEMO_DELETE_MESSAGE =
  'This is a shared demo account — it cannot be deleted so everyone can keep signing in.';

export function getDemoEmails(): string[] {
  const configured = process.env.DEMO_ACCOUNT_EMAILS;
  const emails = configured ? configured.split(',') : DEFAULT_DEMO_EMAILS;

  return emails.map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export function isDemoAccount(email?: string | null): boolean {
  if (!email) {
    return false;
  }

  return getDemoEmails().includes(email.trim().toLowerCase());
}

/**
 * True when `dto` would give any of `fields` a value different from the one the
 * stored document already has. A field resent unchanged is not a change.
 */
export function changesLockedFields<K extends string>(
  dto: Partial<Record<K, unknown>>,
  current: Record<K, unknown>,
  fields: readonly K[],
): boolean {
  return fields.some(
    (field) => dto[field] !== undefined && dto[field] !== current[field],
  );
}
