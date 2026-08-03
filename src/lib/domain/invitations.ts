export type InvitationRole = 'propietario' | 'inquilino' | 'supervisor';

export interface InvitationToken {
  token: string;
  role: InvitationRole;
  expiresAt: string; // ISO date string
  used: boolean;
  revoked?: boolean;
}

export interface Session {
  id: string;
  role: InvitationRole;
  createdAt: string;
  expiresAt: string;
}

export interface AuditLogEntry {
  action: 'generate' | 'verify_success' | 'verify_failed' | 'revoke';
  tokenId: string;
  role: InvitationRole;
  at: string;
}

export interface TokenStore {
  tokens: InvitationToken[];
  auditLog: AuditLogEntry[];
  sessions: Session[];
  save?: () => void;
}

/**
 * Generates a URL-safe 1-time token of 24 bytes using crypto random bytes and base64url format.
 */
export function generateToken(role: InvitationRole, expiresInDays: number): InvitationToken {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback if crypto is unavailable
    for (let i = 0; i < 24; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Convert bytes to binary string
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // base64url encode (URL-safe, replace + with -, / with _, and strip padding =)
  const base64url = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  return {
    token: base64url,
    role,
    expiresAt: expiresAt.toISOString(),
    used: false,
    revoked: false
  };
}

/**
 * Adds a generated token to the store and records the generation in the audit log.
 */
export function addGeneratedToken(store: TokenStore, invitation: InvitationToken): void {
  store.tokens.push(invitation);
  store.auditLog.push({
    action: 'generate',
    tokenId: invitation.token,
    role: invitation.role,
    at: new Date().toISOString()
  });
  store.save?.();
}

/**
 * Consumes a token atomically (one-time use), creates a session, and appends to the audit log.
 */
export function verifyToken(token: string, store: TokenStore): Session {
  const foundToken = store.tokens.find(t => t.token === token);

  if (!foundToken) {
    store.auditLog.push({
      action: 'verify_failed',
      tokenId: token,
      role: 'inquilino', // Default/fallback role for log
      at: new Date().toISOString()
    });
    store.save?.();
    throw new Error('Token not found');
  }

  if (foundToken.used) {
    store.auditLog.push({
      action: 'verify_failed',
      tokenId: token,
      role: foundToken.role,
      at: new Date().toISOString()
    });
    store.save?.();
    throw new Error('Token already used');
  }

  if (foundToken.revoked) {
    store.auditLog.push({
      action: 'verify_failed',
      tokenId: token,
      role: foundToken.role,
      at: new Date().toISOString()
    });
    store.save?.();
    throw new Error('Token has been revoked');
  }

  const expiresDate = new Date(foundToken.expiresAt);
  if (expiresDate.getTime() < Date.now()) {
    store.auditLog.push({
      action: 'verify_failed',
      tokenId: token,
      role: foundToken.role,
      at: new Date().toISOString()
    });
    store.save?.();
    throw new Error('Token has expired');
  }

  // Consume the token
  foundToken.used = true;

  // Create session
  const session: Session = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    role: foundToken.role,
    createdAt: new Date().toISOString(),
    expiresAt: foundToken.expiresAt
  };

  store.sessions.push(session);

  // Audit successful verification
  store.auditLog.push({
    action: 'verify_success',
    tokenId: foundToken.token,
    role: foundToken.role,
    at: new Date().toISOString()
  });

  store.save?.();

  return session;
}

/**
 * Revokes a token so it can no longer be used.
 */
export function revokeToken(token: string, store: TokenStore): void {
  const foundToken = store.tokens.find(t => t.token === token);

  if (!foundToken) {
    throw new Error('Token not found');
  }

  foundToken.revoked = true;

  store.auditLog.push({
    action: 'revoke',
    tokenId: foundToken.token,
    role: foundToken.role,
    at: new Date().toISOString()
  });

  store.save?.();
}

/**
 * Creates an in-memory/localStorage synchronized store for invitation tokens, sessions, and audits.
 */
export function createTokenStore(key = 'nido_invitations_store'): TokenStore {
  let initialData: { tokens?: InvitationToken[]; auditLog?: AuditLogEntry[]; sessions?: Session[] } = {};

  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(key);
    if (saved) {
      try {
        initialData = JSON.parse(saved);
      } catch (e) {
        // Fallback on parse failure
      }
    }
  }

  const store: TokenStore = {
    tokens: initialData.tokens || [],
    auditLog: initialData.auditLog || [],
    sessions: initialData.sessions || [],
    save() {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify({
          tokens: this.tokens,
          auditLog: this.auditLog,
          sessions: this.sessions
        }));
      }
    }
  };

  return store;
}
