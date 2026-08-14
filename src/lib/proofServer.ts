/**
 * Client for shieldfund-proof-server — generates and locally verifies a
 * real payroll_compliance Noir proof, returning proof_hash /
 * public_inputs_hash ready for ProofRegistry.register_proof().
 *
 * https://github.com/Crowder-Stellar/shieldfund-proof-server
 */

const PROOF_SERVER_URL =
  (import.meta.env.VITE_PROOF_SERVER_URL as string | undefined) ?? 'http://localhost:4100';

export interface ProveResult {
  valid: boolean;
  proofType: 'payroll' | 'operational' | 'relief';
  proofHash: string;
  publicInputsHash: string;
  merkleRoot: string;
  budgetCommitment: string;
  budgetSalt: string;
  proofSizeBytes: number;
  provingTimeMs: number;
}

export interface ProveInput {
  recipientId: string;
  amount: string;
  proofType: 'payroll' | 'operational' | 'relief';
  allowlist: string[];
  budgetCap: string;
  budgetSalt?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${PROOF_SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Could not reach proof-server at ${PROOF_SERVER_URL}. Is it running? (npm start in shieldfund-proof-server)`
    );
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `proof-server request to ${path} failed (${res.status})`);
  }
  return json as T;
}

/** Derives a Field-safe recipient id from a Stellar G... address. */
export async function addressToField(address: string): Promise<string> {
  const { recipientId } = await postJson<{ recipientId: string }>('/api/address-to-field', {
    address,
  });
  return recipientId;
}

/**
 * Generates + locally verifies a payroll_compliance ZK proof. Throws (with a
 * message suitable for display) if the recipient isn't on the allowlist, the
 * amount exceeds the budget cap, or the proof-server is unreachable.
 */
export async function proveCompliance(input: ProveInput): Promise<ProveResult> {
  return postJson<ProveResult>('/api/prove', input);
}
