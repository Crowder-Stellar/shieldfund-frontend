/**
 * Client for shieldfund-backend.
 *
 * Proof requests go through the backend rather than straight to
 * shieldfund-proof-server, so budget caps and salts are only ever sent to a
 * server we control. The backend has the proof generated and `bb verify`-ed,
 * then anchors it with register_proof() from its own submitter key.
 *
 * https://github.com/Crowder-Stellar/shieldfund-backend
 */

import { keccak_256 } from '@noble/hashes/sha3.js';

export const API_BASE_URL =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000').replace(/\/$/, '');

export type ProofType = 'payroll' | 'operational' | 'relief';

export interface AnchorProofInput {
  recipientId: string;
  amount: string;
  proofType: ProofType;
  allowlist: string[];
  budgetCap: string;
  budgetSalt?: string;
}

export interface AnchorProofResult {
  proofId: number;
  txHash: string;
  proofType: ProofType;
  proofHash: string;
  publicInputsHash: string;
  merkleRoot: string;
  budgetCommitment: string;
  budgetSalt: string;
}

export interface BackendCampaign {
  id: string;
  title: string;
  goal: string;
  metadata?: Record<string, unknown>;
}

export type BackendErrorKind =
  | 'unreachable'   // network error / CORS
  | 'invalid'       // 400 — request failed validation
  | 'unauthorized'  // 401 — admin token missing or wrong
  | 'duplicate'     // 409 — proof already anchored
  | 'rejected'      // 422 — circuit constraints not satisfied
  | 'rate_limited'  // 429
  | 'upstream'      // 502 — proof server down or bad response
  | 'unavailable'   // 503 — backend not configured for this
  | 'server';       // anything else

export class BackendError extends Error {
  constructor(
    public kind: BackendErrorKind,
    message: string,
    public status?: number,
    public body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

function kindForStatus(status: number): BackendErrorKind {
  switch (status) {
    case 400: return 'invalid';
    case 401: return 'unauthorized';
    case 409: return 'duplicate';
    case 422: return 'rejected';
    case 429: return 'rate_limited';
    case 502: return 'upstream';
    case 503: return 'unavailable';
    default:  return 'server';
  }
}

function messageFor(kind: BackendErrorKind, body: Record<string, unknown>): string {
  const serverMsg = typeof body.error === 'string' ? body.error : undefined;
  switch (kind) {
    case 'invalid': {
      const details = Array.isArray(body.details)
        ? (body.details as Array<{ path?: string; message?: string }>)
            .map(d => (d.path ? `${d.path}: ${d.message}` : d.message))
            .join('; ')
        : '';
      return `Invalid request${details ? ` — ${details}` : serverMsg ? ` — ${serverMsg}` : ''}`;
    }
    case 'unauthorized': return 'Admin token missing or rejected by the backend.';
    case 'duplicate':    return 'This proof is already anchored on-chain.';
    case 'rejected':     return `Proof rejected by the circuit: ${serverMsg ?? 'constraints not satisfied'}`;
    case 'rate_limited': return 'Too many requests — wait a few minutes and try again.';
    case 'upstream':     return `Proof server unavailable: ${serverMsg ?? 'no response'}`;
    case 'unavailable':  return `Backend not configured: ${serverMsg ?? 'service unavailable'}`;
    default:             return serverMsg ?? 'Backend request failed';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new BackendError('unreachable', `Could not reach the ShieldFund backend at ${API_BASE_URL}.`);
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const kind = kindForStatus(res.status);
    throw new BackendError(kind, messageFor(kind, body), res.status, body);
  }
  return body as T;
}

// ── Admin token ───────────────────────────────────────────────────────────────
// Held in memory only (never localStorage) so it's gone when the tab closes.

let adminToken: string | null = null;
export const getAdminToken = () => adminToken;
export const setAdminToken = (token: string | null) => { adminToken = token?.trim() || null; };

// ── API ───────────────────────────────────────────────────────────────────────

/**
 * Generates, verifies and anchors a payroll_compliance proof via the backend.
 * Throws BackendError — `kind` tells the caller how to react.
 */
export async function anchorProof(input: AnchorProofInput): Promise<AnchorProofResult> {
  if (!adminToken) throw new BackendError('unauthorized', 'Admin token required.');
  return request<AnchorProofResult>('/api/proofs', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(input),
  });
}

export async function fetchCampaigns(): Promise<BackendCampaign[]> {
  const { campaigns } = await request<{ campaigns: BackendCampaign[] }>('/api/campaigns');
  return campaigns;
}

// Barretenberg / BN254 scalar field modulus.
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Derives a Field-safe recipient id from a Stellar G... address — the same
 * keccak256-mod-field mapping as shieldfund-proof-server's addressToField(),
 * computed locally so the address doesn't need a network round trip.
 */
export function addressToField(address: string): string {
  const digest = keccak_256(new TextEncoder().encode(address));
  const hex = Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
  const field = BigInt('0x' + hex) % FIELD_MODULUS;
  return '0x' + field.toString(16).padStart(64, '0');
}
