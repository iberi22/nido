/**
 * In-house OAuth link-proof flows for trust-score providers.
 * Authorization Code + state (CSRF) pattern; demo/mock endpoints for tests.
 */

export type OAuthLinkProviderId = 'payment-history' | 'review-history';

export interface Link {
  id: string;
  provider: OAuthLinkProviderId;
  proofId: string;
  claims: Record<string, unknown>;
  verified: boolean;
  verifiedAt: string;
}

export interface FlowStart {
  url: string;
  state: string;
}

export interface LinkProvider {
  readonly provider: OAuthLinkProviderId;
  startFlow(): FlowStart;
  completeFlow(state: string, params: Record<string, string>): Link;
  verifyProof(link: Link): boolean;
}

export interface ProviderConfig {
  /** Base URL for the OAuth authorize endpoint (demo/mock by default). */
  baseUrl?: string;
  /** Fixed claims returned by completeFlow (used by mock/tests). */
  fixedClaims?: Record<string, unknown>;
}

/** Default demo OAuth provider host (in-memory mock in tests). */
export const DEFAULT_OAUTH_BASE = 'https://demo-oauth.nido.local';

const DEFAULT_CLAIMS: Record<OAuthLinkProviderId, Record<string, unknown>> = {
  'payment-history': {
    sub: 'user-payment-demo',
    paymentCount: 12,
    lastPaymentAt: '2026-07-01T00:00:00.000Z',
  },
  'review-history': {
    sub: 'user-review-demo',
    reviewCount: 8,
    averageRating: 4.5,
  },
};

/**
 * Cryptographically random OAuth `state` (CSRF protection).
 */
export function generateOAuthState(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Structural proof check shared by LinkProvider.verifyProof and trust.verifyLink.
 * Requires proofId + claims + verifiedAt and provider-specific claim shape.
 */
export function verifyProofStructure(
  proof: unknown,
  provider: OAuthLinkProviderId | string
): boolean {
  if (!proof || typeof proof !== 'object') return false;
  const p = proof as Record<string, unknown>;

  if (typeof p.proofId !== 'string' || p.proofId.length === 0) return false;
  if (!p.claims || typeof p.claims !== 'object' || Array.isArray(p.claims)) return false;
  if (typeof p.verifiedAt !== 'string' || Number.isNaN(Date.parse(p.verifiedAt))) return false;

  const claims = p.claims as Record<string, unknown>;
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) return false;

  if (provider === 'payment-history') {
    return typeof claims.paymentCount === 'number' && claims.paymentCount >= 0;
  }
  if (provider === 'review-history') {
    return typeof claims.reviewCount === 'number' && claims.reviewCount >= 0;
  }

  // Other trust providers (gov-id, social-graph): subject claim is enough.
  return true;
}

/**
 * verifyProof for a completed Link — real structural verification.
 */
export function verifyProof(link: Link): boolean {
  return verifyProofStructure(
    {
      proofId: link.proofId,
      claims: link.claims,
      verifiedAt: link.verifiedAt,
    },
    link.provider
  );
}

/**
 * Shape stored on TrustLink.proof after a completed OAuth flow.
 */
export function linkToProof(link: Link): Record<string, unknown> {
  return {
    proofId: link.proofId,
    claims: link.claims,
    verifiedAt: link.verifiedAt,
    oauth: true,
    accessToken: `oauth-${link.proofId}`,
  };
}

function createLinkProvider(
  provider: OAuthLinkProviderId,
  config: ProviderConfig = {}
): LinkProvider {
  const baseUrl = config.baseUrl ?? DEFAULT_OAUTH_BASE;
  const claimsTemplate = config.fixedClaims ?? DEFAULT_CLAIMS[provider];

  return {
    provider,

    startFlow(): FlowStart {
      const state = generateOAuthState();
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: 'nido-trust',
        redirect_uri: 'nido://oauth/callback',
        scope: provider === 'payment-history' ? 'payments.read' : 'reviews.read',
        state,
        code_challenge_method: 'S256',
        code_challenge: 'demo-challenge',
      });
      const url = `${baseUrl}/${provider}/authorize?${params.toString()}`;
      return { url, state };
    },

    completeFlow(state: string, params: Record<string, string>): Link {
      if (!state || !params.state || params.state !== state) {
        throw new Error('OAuth state mismatch');
      }
      if (!params.code || params.code.length === 0) {
        throw new Error('Missing authorization code');
      }

      const proofId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `proof-${provider}-${Date.now()}`;

      const verifiedAt = new Date().toISOString();
      const claims: Record<string, unknown> = { ...claimsTemplate };

      return {
        id: `link-${provider}-${proofId}`,
        provider,
        proofId,
        claims,
        verified: true,
        verifiedAt,
      };
    },

    verifyProof(link: Link): boolean {
      if (link.provider !== provider) return false;
      return verifyProof(link);
    },
  };
}

/** Payment-history OAuth link provider (demo/mock endpoint). */
export function createPaymentHistoryProvider(config?: ProviderConfig): LinkProvider {
  return createLinkProvider('payment-history', config);
}

/** Review-history OAuth link provider (demo/mock endpoint). */
export function createReviewHistoryProvider(config?: ProviderConfig): LinkProvider {
  return createLinkProvider('review-history', config);
}

/** Resolve a LinkProvider by id. */
export function getLinkProvider(
  provider: OAuthLinkProviderId,
  config?: ProviderConfig
): LinkProvider {
  if (provider === 'payment-history') return createPaymentHistoryProvider(config);
  return createReviewHistoryProvider(config);
}
