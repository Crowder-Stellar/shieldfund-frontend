/**
 * Stellar SDK service layer for ShieldFund.
 *
 * All blockchain I/O lives here. React components never import stellar-sdk
 * directly — they call these functions and get back plain JS objects matching
 * the types in src/types.ts.
 *
 * Pattern for read calls : simulateTransaction (free, no signing needed)
 * Pattern for write calls: prepareTransaction → Freighter sign → sendTransaction
 *                          → poll getTransaction until SUCCESS / FAILED
 */

import {
  rpc as SorobanRpc,
  TransactionBuilder,
  Contract,
  Networks,
  nativeToScVal,
  scValToNative,
  Address,
  BASE_FEE,
  xdr,
} from '@stellar/stellar-sdk';

import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';

import {
  activeConfig,
  activeContracts,
  ACTIVE_NETWORK,
  STROOPS_PER_USDC,
  SECONDS_PER_MONTH,
} from './contracts';

import type { TreasuryData, Transaction, Stream, VerifiableProof } from '../types';

// ── Shared RPC client (lazily created) ───────────────────────────────────────

let _server: SorobanRpc.Server | null = null;
function server(): SorobanRpc.Server {
  if (!_server) {
    _server = new SorobanRpc.Server(activeConfig().sorobanRpcUrl, {
      allowHttp: false,
    });
  }
  return _server;
}

// ── Unit conversion helpers ───────────────────────────────────────────────────

/** USDC float → stroops BigInt. e.g. 5000.0 → 50_000_000_000n */
export const usdcToStroops = (usdc: number): bigint =>
  BigInt(Math.round(usdc * Number(STROOPS_PER_USDC)));

/** Stroops BigInt → USDC float. */
export const stroopsToUsdc = (stroops: bigint): number =>
  Number(stroops) / Number(STROOPS_PER_USDC);

/** USDC/month float → stroops-per-second BigInt. */
export const monthlyToPerSecond = (usdcPerMonth: number): bigint =>
  (usdcToStroops(usdcPerMonth) + SECONDS_PER_MONTH - 1n) / SECONDS_PER_MONTH;

// ── Wallet ────────────────────────────────────────────────────────────────────

/** Returns true if Freighter extension is installed and accessible. */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Connects to Freighter and returns the user's Stellar public key.
 *
 * Flow:
 *  1. isConnected()   — verify extension is installed
 *  2. requestAccess() — trigger Freighter popup; user approves or rejects
 *  3. getAddress()    — read the active account's public key
 *
 * Throws a user-readable error at each stage so the UI can present a
 * "Get Freighter" link vs a "User rejected" message, etc.
 */
export async function connectFreighter(): Promise<string> {
  const { isConnected: connected } = await isConnected();
  if (!connected) {
    throw new Error(
      'Freighter wallet is not installed. Visit https://freighter.app to install it.'
    );
  }

  // Trigger the browser extension popup asking the user to grant access.
  const accessResult = await requestAccess();
  if ('error' in accessResult && accessResult.error) {
    throw new Error(accessResult.error.message ?? 'User rejected the connection request.');
  }

  const { address, error } = await getAddress();
  if (error || !address) {
    throw new Error(error?.message ?? 'Could not retrieve address from Freighter.');
  }
  return address;
}

// ── Internal: build + sign + submit ──────────────────────────────────────────

/**
 * Low-level helper: simulate → prepare → sign → send → poll.
 *
 * Returns the confirmed transaction hash on success.
 * Throws a descriptive error on failure or rejection.
 */
async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signerAddress: string,
): Promise<string> {
  const rpc = server();
  const contract = new Contract(contractId);
  const account = await rpc.getAccount(signerAddress);
  const networkPassphrase =
    ACTIVE_NETWORK === 'MAINNET' ? Networks.PUBLIC : Networks.TESTNET;

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = await rpc.prepareTransaction(tx);
  const xdrTx = preparedTx.toXDR();

  // Ask Freighter to sign.
  let signedXdr: string;
  try {
    const result = await signTransaction(xdrTx, { networkPassphrase });
    if (result.error) throw new Error(result.error.message);
    signedXdr = result.signedTxXdr;
  } catch (err) {
    throw new Error('Transaction rejected by user.');
  }

  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const sendResult = await rpc.sendTransaction(signedTx);

  if (sendResult.status === 'ERROR') {
    throw new Error(`Send failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  // Poll until the ledger closes and the tx is confirmed or failed.
  return pollTransaction(sendResult.hash);
}

/** Poll `getTransaction` until it leaves the NOT_FOUND / PENDING state. */
async function pollTransaction(hash: string): Promise<string> {
  const rpc = server();
  const maxAttempts = 30;
  const delay = 1500;

  for (let i = 0; i < maxAttempts; i++) {
    const result = await rpc.getTransaction(hash);
    if (result.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return hash;
    }
    if (result.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction ${hash} failed on chain.`);
    }
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error(`Transaction ${hash} not confirmed after ${maxAttempts} attempts.`);
}

/** Read-only Soroban simulation — no signing, no fee. */
async function readContract<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  fallbackAddress?: string,
): Promise<T> {
  const rpc = server();
  const contract = new Contract(contractId);
  const networkPassphrase =
    ACTIVE_NETWORK === 'MAINNET' ? Networks.PUBLIC : Networks.TESTNET;

  // For simulation we need any valid account. Use a well-known testnet account
  // if the caller isn't connected, or fall back to a zero-keypair trick.
  const address =
    fallbackAddress ?? 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
  const account = await rpc.getAccount(address);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const result = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(result)) {
    throw new Error(`Read failed (${method}): ${result.error}`);
  }
  if (!result.result) {
    throw new Error(`Read returned no result for ${method}`);
  }

  return scValToNative(result.result.retval) as T;
}

// ── Treasury Vault ────────────────────────────────────────────────────────────

/**
 * Fetches live vault stats from the TreasuryVault contract.
 * Maps on-chain `VaultStats` (stroops) to the frontend `TreasuryData` type (USDC).
 */
export async function fetchVaultStats(): Promise<TreasuryData> {
  const id = activeContracts().TREASURY_VAULT;
  if (!id) throw new Error('TREASURY_VAULT contract ID not set — deploy first.');

  const stats = await readContract<{
    vault_balance: bigint;
    total_raised: bigint;
    total_disbursed: bigint;
  }>(id, 'get_stats', []);

  return {
    vaultBalance:    stroopsToUsdc(stats.vault_balance),
    totalRaised:     stroopsToUsdc(stats.total_raised),
    totalDisbursed:  stroopsToUsdc(stats.total_disbursed),
    lastAuditTime:   new Date().toISOString(),
  };
}

/**
 * Deposit USDC into the vault.
 * `amount` is in USDC (e.g. 1000 = 1 000 USDC).
 * Returns the confirmed transaction hash.
 */
export async function deposit(
  amount: number,
  signerAddress: string,
): Promise<string> {
  const id = activeContracts().TREASURY_VAULT;
  if (!id) throw new Error('TREASURY_VAULT contract ID not set.');

  return invokeContract(id, 'deposit', [
    new Address(signerAddress).toScVal(),
    nativeToScVal(usdcToStroops(amount), { type: 'i128' }),
  ], signerAddress);
}

/**
 * Admin disburses USDC to a recipient.
 * `proofHashHex` is the 64-char hex of the Noir proof hash (no 0x prefix).
 */
export async function disburse(
  recipientAddress: string,
  amount: number,
  proofHashHex: string,
  signerAddress: string,
): Promise<string> {
  const id = activeContracts().TREASURY_VAULT;
  if (!id) throw new Error('TREASURY_VAULT contract ID not set.');

  const hashBytes = Buffer.from(proofHashHex.padStart(64, '0'), 'hex');

  return invokeContract(id, 'disburse', [
    new Address(recipientAddress).toScVal(),
    nativeToScVal(usdcToStroops(amount), { type: 'i128' }),
    nativeToScVal(hashBytes, { type: 'bytes' }),
  ], signerAddress);
}

// ── Streaming ─────────────────────────────────────────────────────────────────

/**
 * Returns all streams from the Streaming contract.
 * Maps on-chain `Stream` structs to the frontend `Stream` type.
 */
export async function fetchStreams(): Promise<Stream[]> {
  const id = activeContracts().STREAMING;
  if (!id) throw new Error('STREAMING contract ID not set.');

  const raw = await readContract<Array<{
    id: bigint;
    recipient: string;
    flow_rate_per_second: bigint;
    start_time: bigint;
    end_time: bigint;
    accumulated: bigint;
    last_update: bigint;
    status: { tag: string };
  }>>(id, 'get_all_streams', []);

  return raw.map(s => ({
    id:               `s${s.id}`,
    title:            `Stream #${s.id}`,
    recipient:        s.recipient,
    accumulatedValue: stroopsToUsdc(s.accumulated),
    flowRateAmount:   Number(
      (s.flow_rate_per_second * SECONDS_PER_MONTH) / STROOPS_PER_USDC
    ),
    endDate: new Date(Number(s.end_time) * 1000).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }),
    status: s.status.tag === 'Active' ? 'ACTIVE' : 'PAUSED',
  }));
}

/** Returns live accumulated USDC (float) for a single stream. */
export async function fetchStreamAccumulated(streamId: number): Promise<number> {
  const id = activeContracts().STREAMING;
  if (!id) throw new Error('STREAMING contract ID not set.');

  const stroops = await readContract<bigint>(id, 'get_accumulated', [
    nativeToScVal(streamId, { type: 'u32' }),
  ]);
  return stroopsToUsdc(stroops);
}

/**
 * Admin creates a new stream.
 * `flowRatePerMonth` is in USDC (e.g. 5000).
 * `endDateStr` is an ISO date string (e.g. "2025-12-31").
 */
export async function createStream(
  recipientAddress: string,
  flowRatePerMonth: number,
  endDateStr: string,
  signerAddress: string,
): Promise<string> {
  const id = activeContracts().STREAMING;
  if (!id) throw new Error('STREAMING contract ID not set.');

  const endTime = BigInt(Math.floor(new Date(endDateStr).getTime() / 1000));
  const flowPerSec = monthlyToPerSecond(flowRatePerMonth);

  return invokeContract(id, 'create_stream', [
    new Address(recipientAddress).toScVal(),
    nativeToScVal(flowPerSec, { type: 'i128' }),
    nativeToScVal(endTime, { type: 'u64' }),
  ], signerAddress);
}

/** Admin toggles a stream between ACTIVE ↔ PAUSED. */
export async function toggleStream(
  streamId: number,
  signerAddress: string,
): Promise<string> {
  const id = activeContracts().STREAMING;
  if (!id) throw new Error('STREAMING contract ID not set.');

  return invokeContract(id, 'toggle_stream', [
    nativeToScVal(streamId, { type: 'u32' }),
  ], signerAddress);
}

// ── Proof Registry ────────────────────────────────────────────────────────────

/** Returns all registered proofs from the ProofRegistry contract. */
export async function fetchProofs(): Promise<VerifiableProof[]> {
  const id = activeContracts().PROOF_REGISTRY;
  if (!id) throw new Error('PROOF_REGISTRY contract ID not set.');

  const raw = await readContract<Array<{
    id: bigint;
    proof_hash: Uint8Array;
    public_inputs_hash: Uint8Array;
    proof_type: string;
    timestamp: bigint;
    submitter: string;
  }>>(id, 'get_all_proofs', []);

  return raw.map(p => ({
    id:         `p${p.id}`,
    title:      `${p.proof_type.charAt(0).toUpperCase() + p.proof_type.slice(1)} Proof #${p.id}`,
    hash:       '0x' + Buffer.from(p.proof_hash).toString('hex').slice(0, 6) + '…' +
                Buffer.from(p.proof_hash).toString('hex').slice(-4),
    date:       new Date(Number(p.timestamp) * 1000).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).replace(/\//g, '.'),
    complexity: p.proof_type === 'payroll' ? 2 : p.proof_type === 'operational' ? 3 : 1,
    status:     'VERIFIED' as const,
    type:       p.proof_type as 'payroll' | 'operational' | 'relief',
  }));
}

/**
 * Registers a ZK proof on-chain (called after successful off-chain Noir verification).
 * Both hashes must be 64-char hex strings (no 0x prefix).
 */
export async function registerProof(
  proofHashHex: string,
  proofType: 'payroll' | 'operational' | 'relief',
  publicInputsHashHex: string,
  signerAddress: string,
): Promise<string> {
  const id = activeContracts().PROOF_REGISTRY;
  if (!id) throw new Error('PROOF_REGISTRY contract ID not set.');

  const proofHashBytes      = Buffer.from(proofHashHex.padStart(64, '0'), 'hex');
  const publicInputsBytes   = Buffer.from(publicInputsHashHex.padStart(64, '0'), 'hex');

  return invokeContract(id, 'register_proof', [
    new Address(signerAddress).toScVal(),
    nativeToScVal(proofHashBytes, { type: 'bytes' }),
    nativeToScVal(publicInputsBytes, { type: 'bytes' }),
    nativeToScVal(proofType, { type: 'symbol' }),
  ], signerAddress);
}

/** Quick check: has this proof hash been registered on-chain? */
export async function verifyProofOnChain(proofHashHex: string): Promise<boolean> {
  const id = activeContracts().PROOF_REGISTRY;
  if (!id) return false;

  const hashBytes = Buffer.from(proofHashHex.padStart(64, '0'), 'hex');
  try {
    return await readContract<boolean>(id, 'verify_proof_exists', [
      nativeToScVal(hashBytes, { type: 'bytes' }),
    ]);
  } catch {
    return false;
  }
}

// ── Horizon helpers ───────────────────────────────────────────────────────────

/**
 * Fetches recent USDC payments to/from the vault address via Horizon.
 * Maps to the frontend `Transaction[]` type.
 *
 * Note: Horizon only sees Stellar operations, not Soroban events.
 * For full history, you'd need a dedicated event indexer.
 * This covers native XLM + SAC transfers well enough for the MVP.
 */
export async function fetchHorizonTransactions(
  vaultAddress: string,
  limit = 20,
): Promise<Transaction[]> {
  const url =
    `${activeConfig().horizonUrl}/accounts/${vaultAddress}/payments` +
    `?limit=${limit}&order=desc`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json() as {
    _embedded: { records: Array<{
      id: string;
      type: string;
      from: string;
      to: string;
      amount: string;
      asset_code?: string;
      asset_issuer?: string;
      created_at: string;
      transaction_hash: string;
    }> };
  };

  return json._embedded.records
    .filter(r => r.asset_code === 'USDC')
    .map((r, i) => ({
      id:             r.id || `ht${i}`,
      type:           r.to === vaultAddress ? 'Inflow' : 'Outflow',
      title:          r.to === vaultAddress
                        ? `Inflow: USDC Deposit`
                        : `Outflow: USDC Disbursement`,
      txHash:         r.transaction_hash.slice(0, 6) + '…' + r.transaction_hash.slice(-4),
      senderReceiver: r.to === vaultAddress ? r.from : r.to,
      amount:         parseFloat(r.amount),
      time:           new Date(r.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                      }),
      category:       'Operational' as const,
    }));
}
