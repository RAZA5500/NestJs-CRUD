import { createHash, randomUUID } from 'node:crypto';

/**
 * Short-lived token sent with every request in the Authorization header. Kept
 * brief on purpose: a leaked access token stops working within the hour.
 */
export const ACCESS_TOKEN_TTL = '1h';

/**
 * Long-lived token the client swaps for a fresh pair at POST /auth/refresh, so
 * someone who signs in stays signed in for 20 days without re-entering a
 * password.
 */
export const REFRESH_TOKEN_TTL_DAYS = 20;
export const REFRESH_TOKEN_TTL = `${REFRESH_TOKEN_TTL_DAYS}d`;
export const REFRESH_TOKEN_TTL_MS =
  REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Claim that separates a refresh token from an access token of the same shape. */
export const REFRESH_TOKEN_TYPE = 'refresh';

/**
 * Refresh tokens get their own secret when one is configured, so an access
 * token can never be replayed as a refresh token (and vice versa).
 */
export function getRefreshTokenSecret(): string | undefined {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
}

/**
 * Unique id for one refresh token. Without it two tokens minted for the same
 * user in the same second would be byte-identical (same payload, same iat),
 * which both breaks rotation and collides on the stored hash's unique index.
 */
export function newRefreshTokenId(): string {
  return randomUUID();
}

/**
 * Only this hash is stored server side — a stolen database dump cannot be
 * replayed as a login. SHA-256 is enough here (unlike a password) because the
 * token is a long random-signed JWT, not something a human picked.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
