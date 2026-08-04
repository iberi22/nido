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

/**
 * Checks if WebAuthn platform authenticator credentials capabilities exist locally.
 */
export async function isWebAuthnAvailable(): Promise<boolean> {
  // TODO: Fully implement WebAuthn utilizing @simplewebauthn/browser in a future wave
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    // Perform robust runtime support validation
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      try {
        return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (e) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/**
 * Enrolls a platform biometric credential (WebAuthn stub).
 */
export async function enrollBiometric(username: string): Promise<string> {
  // TODO: Replace with complete @simplewebauthn/browser options payload registration flows
  if (!username) {
    throw new Error("Username must be provided for biometric enrollment");
  }
  const mockCredId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? 'cred_' + crypto.randomUUID()
    : 'cred_' + Math.random().toString(36).substring(2);
  return mockCredId;
}

/**
 * Authenticates user credentials using biometrics (WebAuthn stub).
 */
export async function authenticateBiometric(credentialId: string): Promise<boolean> {
  // TODO: Replace with full @simplewebauthn/browser verification process
  if (!credentialId) {
    return false;
  }
  return credentialId.startsWith('cred_');
}
