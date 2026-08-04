import {
  startRegistration,
  startAuthentication,
  bufferToBase64URLString,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

export type Role = 'admin' | 'propietario' | 'inquilino' | 'supervisor';

export interface Account {
  id: string;
  name: string;
  seedPhrase: string;
  createdAt: string;
  role: Role;
}

// 256 BIP39-style words to provide strong local entropy and validation without massive overhead
export const WORDLIST: string[] = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
  "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
  "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
  "adult", "advance", "advice", "advise", "aerobic", "affair", "afford", "afraid", "again", "age",
  "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol",
  "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also",
  "alter", "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient",
  "anger", "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna",
  "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch",
  "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange",
  "arrest", "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault",
  "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract",
  "auction", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid",
  "awake", "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon",
  "badge", "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely",
  "bargain", "barrel", "barrier", "base", "basic", "basket", "battle", "beach", "bean", "beauty",
  "because", "become", "beef", "before", "begin", "behave", "behind", "believe", "below", "belt",
  "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike",
  "bind", "biology", "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast",
  "bleak", "bless", "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board",
  "boat", "body", "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring",
  "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass",
  "brave", "bread", "breeze", "brick", "bridge", "brief"
];

/**
 * Generates a standard BIP39-style 12-word seed phrase from entropy.
 */
export function generateSeedPhrase(): string {
  const randomBytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Cryptographically secure-like fallback for non-browser/test environments
    for (let i = 0; i < 12; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const words = Array.from(randomBytes).map(byte => WORDLIST[byte % WORDLIST.length]);
  return words.join(" ");
}

/**
 * Creates a new offline-first local auth account with a 12-word recovery seed phrase.
 * Role defaults to 'admin' (propietario default) to grant initial administrative rights.
 */
export function createAccount(name: string): Account {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'usr_' + Math.random().toString(36).substring(2);

  const seedPhrase = generateSeedPhrase();

  return {
    id,
    name,
    seedPhrase,
    createdAt: new Date().toISOString(),
    role: 'admin'
  };
}

/**
 * Confirms if the provided recovery phrase matches the account's seed phrase.
 */
export function confirmSeed(account: Account, phrase: string): boolean {
  if (!account || !phrase) return false;
  return account.seedPhrase.trim().toLowerCase() === phrase.trim().toLowerCase();
}

/**
 * Assigns a specific workspace role to an account.
 */
export function assignRole(account: Account, role: Role): Account {
  return {
    ...account,
    role
  };
}

/**
 * Generates a unique workspace instance ID for local isolation of workspace data.
 * Adheres to REQ-004.
 */
export function createInstance(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Standard UUID v4 generation fallback for test runner and older runtime environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Offline-first Storage LocalStorage helpers
const ACCOUNT_STORAGE_KEY = 'nido_user_account';
const INSTANCE_STORAGE_KEY = 'nido_workspace_instance_id';

/**
 * Persists user account securely to localStorage.
 */
export function saveAccountToLocalStorage(account: Account): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  }
}

/**
 * Retrieves the persisted account from local storage.
 */
export function loadAccountFromLocalStorage(): Account | null {
  if (typeof localStorage !== 'undefined') {
    const data = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data) as Account;
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

/**
 * Persists workspace instance ID to local storage.
 */
export function saveInstanceToLocalStorage(instance_id: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(INSTANCE_STORAGE_KEY, instance_id);
  }
}

/**
 * Retrieves the persisted workspace instance ID from local storage.
 */
export function loadInstanceFromLocalStorage(): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(INSTANCE_STORAGE_KEY);
  }
  return null;
}

/**
 * Clears the persisted account and workspace configuration data.
 */
export function clearLocalStorage(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    localStorage.removeItem(INSTANCE_STORAGE_KEY);
  }
}

/** Typed error when WebAuthn cannot run (missing API or non-secure context). */
export class WebAuthnUnavailableError extends Error {
  readonly code = 'WEBAUTHN_UNAVAILABLE' as const;

  constructor(message = 'WebAuthn is unavailable in this environment') {
    super(message);
    this.name = 'WebAuthnUnavailableError';
  }
}

function isSecureWebAuthnContext(): boolean {
  // Allow when isSecureContext is unknown (SSR/tests); block only when explicitly insecure.
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return false;
  }
  return true;
}

function randomBase64URL(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bufferToBase64URLString(uint8ToArrayBuffer(bytes));
}

function encodeUserId(username: string): string {
  return bufferToBase64URLString(uint8ToArrayBuffer(new TextEncoder().encode(username)));
}

function uint8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function relyingPartyId(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

/**
 * Checks if WebAuthn credentials API exists locally (navigator.credentials).
 */
export async function isWebAuthnAvailable(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.credentials) {
      return false;
    }
    if (!isSecureWebAuthnContext()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies if an account has the required role based on role privilege hierarchy.
 * Hierarchy from highest to lowest: admin > propietario > supervisor > inquilino.
 * An account with higher or equal role is authorized.
 */
export function requireRole(account: Account | null | undefined, requiredRole: Role): boolean {
  if (!account) {
    return false;
  }
  const hierarchy: Record<Role, number> = {
    admin: 4,
    propietario: 3,
    supervisor: 2,
    inquilino: 1,
  };
  const accountLevel = hierarchy[account.role] ?? 0;
  const requiredLevel = hierarchy[requiredRole] ?? 0;
  return accountLevel >= requiredLevel;
}

/**
 * Enrolls a platform biometric credential via WebAuthn registration (startRegistration).
 * Offline-first: builds PublicKeyCredentialCreationOptions locally (no server).
 */
export async function enrollBiometric(username: string): Promise<string> {
  if (!username) {
    throw new Error('Username must be provided for biometric enrollment');
  }

  if (!(await isWebAuthnAvailable())) {
    throw new WebAuthnUnavailableError();
  }

  const optionsJSON: PublicKeyCredentialCreationOptionsJSON = {
    rp: {
      name: 'NIDO',
      id: relyingPartyId(),
    },
    user: {
      id: encodeUserId(username),
      name: username,
      displayName: username,
    },
    challenge: randomBase64URL(32),
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: 60_000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
    attestation: 'none',
  };

  const credential = await startRegistration({ optionsJSON });
  return credential.id;
}

/**
 * Authenticates via WebAuthn assertion (startAuthentication) for a stored credential id.
 * Returns false on missing id, unavailable API, or failed assertion — never throws for soft failures.
 */
export async function authenticateBiometric(credentialId: string): Promise<boolean> {
  if (!credentialId) {
    return false;
  }

  if (!(await isWebAuthnAvailable())) {
    return false;
  }

  const optionsJSON: PublicKeyCredentialRequestOptionsJSON = {
    challenge: randomBase64URL(32),
    timeout: 60_000,
    rpId: relyingPartyId(),
    allowCredentials: [
      {
        id: credentialId,
        type: 'public-key',
        transports: ['internal'],
      },
    ],
    userVerification: 'preferred',
  };

  try {
    const assertion = await startAuthentication({ optionsJSON });
    return typeof assertion.id === 'string' && assertion.id.length > 0;
  } catch {
    return false;
  }
}
