export type TrustProvider = 'gov-id' | 'payment-history' | 'review-history' | 'social-graph';

export interface TrustLink {
  id: string;
  provider: TrustProvider;
  proof: unknown;
  verified: boolean;
  visible: boolean;
}

export interface TrustHistory {
  completedRentals: number;
  polygonDepositActive: boolean;
}

export interface TrustScoreBreakdown {
  govId: number;
  payments: number;
  reviews: number;
  social: number;
}

export interface TrustScoreResult {
  tier: 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
  score: number;
  breakdown: TrustScoreBreakdown;
}

/**
 * Validates if the given proof looks like a manual upload (such as files, images, paths).
 * Returns true if it looks like a manual upload, false otherwise.
 */
export function isManualUpload(proof: unknown): boolean {
  if (!proof) return true;

  if (typeof proof === 'string') {
    const lower = proof.toLowerCase().trim();
    if (
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.pdf') ||
      lower.endsWith('.webp')
    ) {
      return true;
    }
    if (
      lower.startsWith('data:image/') ||
      lower.startsWith('data:application/pdf') ||
      lower.startsWith('data:')
    ) {
      return true;
    }
    // Simple path patterns or file paths
    if (lower.includes('/') && (lower.includes('upload') || lower.includes('file'))) {
      return true;
    }
    // Short strings without any structure (tokens are usually long and have dots/dashes/hashes)
    if (lower.length < 15 && !lower.includes('.') && !lower.includes('-')) {
      return true;
    }
  } else if (typeof proof === 'object') {
    const keys = Object.keys(proof as object).map(k => k.toLowerCase());
    const manualKeys = ['file', 'filename', 'filepath', 'uri', 'image', 'selfie', 'document', 'pdf', 'upload', 'manual', 'scan'];
    if (keys.some(k => manualKeys.some(mk => k.includes(mk)))) {
      return true;
    }
    // Also, must have some OAuth/API typical keys to be verified as OAuth/API proof
    const apiKeys = [
      'token', 'access', 'oauth', 'session', 'signature', 'jwt', 'auth', 'api',
      'client', 'secret', 'key', 'issuer', 'proof_id', 'credential', 'payload', 'hash'
    ];
    const hasApiKey = keys.some(k => apiKeys.some(ak => k.includes(ak)));
    if (!hasApiKey) {
      return true;
    }
  }
  return false;
}

/**
 * Adds a new trust link with proof. Rejects manual uploads.
 */
export function addLink(
  links: TrustLink[],
  { provider, proof }: { provider: TrustProvider; proof: unknown }
): TrustLink {
  if (isManualUpload(proof)) {
    throw new Error(`Manual upload is rejected for provider ${provider}. API/OAuth proof required.`);
  }

  const newLink: TrustLink = {
    id: `link-${provider}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    provider,
    proof,
    verified: false, // Must be verified via verifyLink
    visible: true,
  };

  links.push(newLink);
  return newLink;
}

/**
 * Verifies a link proof (OAuth/API validation stub for M5, real implementation in M5.5).
 */
export function verifyLink(link: TrustLink): { valid: boolean; reason?: string } {
  if (isManualUpload(link.proof)) {
    return { valid: false, reason: 'Proof is a manual file/image upload' };
  }

  // Check expected shapes for M5 proof validation
  if (link.proof && typeof link.proof === 'object') {
    const keys = Object.keys(link.proof as object).map(k => k.toLowerCase());
    const hasTokenOrSig = keys.some(k =>
      k.includes('token') ||
      k.includes('access') ||
      k.includes('oauth') ||
      k.includes('session') ||
      k.includes('signature') ||
      k.includes('credential') ||
      k.includes('payload')
    );
    if (!hasTokenOrSig) {
      return { valid: false, reason: 'Proof lacks OAuth/API tokens, sessions, or signature attributes' };
    }
  }

  return { valid: true };
}

/**
 * Privacy control to toggle visibility of links by provider.
 */
export function setVisibility(
  links: TrustLink[],
  provider: TrustProvider,
  visible: boolean
): TrustLink[] {
  return links.map(link => {
    if (link.provider === provider) {
      return { ...link, visible };
    }
    return link;
  });
}

/**
 * Anti-gaming helper to verify that no single provider source inflates the score beyond a cap.
 */
export function noSingleSourceInflates(breakdown: TrustScoreBreakdown, cap = 40): boolean {
  return (
    breakdown.govId <= cap &&
    breakdown.payments <= cap &&
    breakdown.reviews <= cap &&
    breakdown.social <= cap
  );
}

/**
 * Computes the T1-T4 trust score based on verified links and rental/deposit history.
 */
export function computeTrustScore(
  links: TrustLink[],
  history: TrustHistory,
  config?: { completedRentalsThreshold?: number; cap?: number }
): TrustScoreResult {
  const threshold = config?.completedRentalsThreshold ?? 3;
  const contributionCap = config?.cap ?? 40;

  // 1. Gather verified links
  const verifiedLinks = links.filter(l => l.verified);
  const hasVerifiedGovId = verifiedLinks.some(l => l.provider === 'gov-id');
  const hasVerifiedPayments = verifiedLinks.some(l => l.provider === 'payment-history');
  const hasVerifiedReviews = verifiedLinks.some(l => l.provider === 'review-history');
  const hasVerifiedSocial = verifiedLinks.some(l => l.provider === 'social-graph');

  // 2. Determine Tier Progression EXACTLY
  // T1 = gov-id verified (base)
  // T2 = >= 1 linked external session (payments/reviews/social)
  // T3 = T2 + on-network history (>= N completed rentals)
  // T4 = T3 + Polygon deposit/collateral (boolean)
  let tier: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' = 'T0';

  if (hasVerifiedGovId) {
    tier = 'T1';

    const hasExternalSession = hasVerifiedPayments || hasVerifiedReviews || hasVerifiedSocial;
    if (hasExternalSession) {
      tier = 'T2';

      const hasOnNetworkHistory = history.completedRentals >= threshold;
      if (hasOnNetworkHistory) {
        tier = 'T3';

        if (history.polygonDepositActive) {
          tier = 'T4';
        }
      }
    }
  }

  // 3. Compute breakdown scores with anti-gaming caps
  // Base values per link type:
  // gov-id: 30 pts, payment-history: 30 pts, review-history: 25 pts, social-graph: 15 pts
  const rawGovId = verifiedLinks.filter(l => l.provider === 'gov-id').length * 30;
  const rawPayments = verifiedLinks.filter(l => l.provider === 'payment-history').length * 30;
  const rawReviews = verifiedLinks.filter(l => l.provider === 'review-history').length * 25;
  const rawSocial = verifiedLinks.filter(l => l.provider === 'social-graph').length * 15;

  // Apply capping to each category
  const govIdScore = Math.min(rawGovId, contributionCap);
  const paymentsScore = Math.min(rawPayments, contributionCap);
  const reviewsScore = Math.min(rawReviews, contributionCap);
  const socialScore = Math.min(rawSocial, contributionCap);

  const breakdown: TrustScoreBreakdown = {
    govId: govIdScore,
    payments: paymentsScore,
    reviews: reviewsScore,
    social: socialScore,
  };

  // Combine scores, ensuring total is clamped to [0, 100]
  const totalScore = Math.min(govIdScore + paymentsScore + reviewsScore + socialScore, 100);

  return {
    tier,
    score: totalScore,
    breakdown,
  };
}
