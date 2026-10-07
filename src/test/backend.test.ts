import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  addressToField,
  anchorProof,
  BackendError,
  setAdminToken,
  getAdminToken,
} from '../lib/backend';

const input = {
  recipientId: '0x2a',
  amount: '1',
  proofType: 'payroll' as const,
  allowlist: ['0x2a'],
  budgetCap: '1000',
};

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  setAdminToken(null);
});

describe('addressToField', () => {
  it('matches shieldfund-proof-server (keccak256 mod BN254 field)', () => {
    expect(addressToField('GBJ5FP5UB4YUE2EONTPPSAGKZZGDETFZLEJXJRCALSYTJZIDVWAN3C7P')).toBe(
      '0x1f5e152d8c3ea3c53910a0328b35a2ea0408937977bb10bde7562f287a1e3ed9',
    );
  });
});

describe('anchorProof', () => {
  it('refuses to call the backend without an admin token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(anchorProof(input)).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends the bearer token to the backend /api/proofs endpoint', async () => {
    setAdminToken(' secret ');
    const spy = mockFetch(201, { proofId: 1, txHash: 'ab' });
    await anchorProof(input);
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/proofs$/);
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer secret');
  });

  it.each([
    [400, { error: 'Invalid request', details: [{ path: 'amount', message: 'bad' }] }, 'invalid', /amount: bad/],
    [401, { error: 'Unauthorized' }, 'unauthorized', /admin token/i],
    [409, { error: 'dup' }, 'duplicate', /already anchored/i],
    [422, { error: 'amount <= budget_cap' }, 'rejected', /budget_cap/],
    [429, { error: 'slow down' }, 'rate_limited', /too many/i],
    [502, { error: 'Proof server unreachable' }, 'upstream', /proof server/i],
    [503, { error: 'PROOF_SUBMITTER_SECRET not configured' }, 'unavailable', /not configured/i],
  ])('maps HTTP %i to a %s error', async (status, body, kind, message) => {
    setAdminToken('t');
    mockFetch(status, body);
    const err = await anchorProof(input).catch(e => e);
    expect(err).toBeInstanceOf(BackendError);
    expect(err.kind).toBe(kind);
    expect(err.status).toBe(status);
    expect(err.message).toMatch(message);
  });

  it('reports an unreachable backend', async () => {
    setAdminToken('t');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(anchorProof(input)).rejects.toMatchObject({ kind: 'unreachable' });
  });
});
