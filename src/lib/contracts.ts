/**
 * Network configuration and contract IDs for ShieldFund.
 *
 * Everything deployment-specific comes from VITE_* env vars at build time
 * (see .env.example), falling back to the current testnet deployment:
 *
 *   VITE_STELLAR_NETWORK              TESTNET (default) | MAINNET
 *   VITE_TREASURY_VAULT_CONTRACT_ID   C... — overrides the default for the active network
 *   VITE_STREAMING_CONTRACT_ID        C...
 *   VITE_PROOF_REGISTRY_CONTRACT_ID   C...
 *   VITE_SOROBAN_RPC_URL              https://… — overrides the active network's RPC
 *                                     (required for MAINNET: there is no keyless default)
 *
 * This file is the only place network-specific constants live — the rest of
 * src/lib/stellar.ts reads from here.
 */

export type Network = 'TESTNET' | 'MAINNET';

export interface NetworkConfig {
  /** Empty when no RPC is configured (MAINNET without VITE_SOROBAN_RPC_URL). */
  sorobanRpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
}

export const NETWORK_CONFIG: Record<Network, NetworkConfig> = {
  TESTNET: {
    sorobanRpcUrl:      'https://soroban-testnet.stellar.org',
    horizonUrl:         'https://horizon-testnet.stellar.org',
    networkPassphrase:  'Test SDF Network ; September 2015',
  },
  MAINNET: {
    // No public keyless mainnet RPC exists; provide one via VITE_SOROBAN_RPC_URL.
    sorobanRpcUrl:      '',
    horizonUrl:         'https://horizon.stellar.org',
    networkPassphrase:  'Public Global Stellar Network ; September 2015',
  },
};

export interface ContractSet {
  TREASURY_VAULT:  string;
  STREAMING:       string;
  PROOF_REGISTRY:  string;
  /** Circle's USDC Stellar Asset Contract (SAC). */
  USDC_SAC:        string;
}

/** Defaults used when the VITE_*_CONTRACT_ID env vars are not set. */
export const CONTRACT_IDS: Record<Network, ContractSet> = {
  TESTNET: {
    TREASURY_VAULT:  'CAUWJPC73YLQMSV6X4QPLUVS2UZFE2PMRIQSSCDN62DNN6J76Y5RETIG',
    STREAMING:       'CDU7ZIVQ3UC4K3DHV3NMQGW5UMSYFCKCC6YJKHT4YLNEZJRWL6THE6WQ',
    PROOF_REGISTRY:  'CBDLHQQPKC5524CFWPD4HMPTZGWBYQNW3IKGAFH6IAYBU3F2F6AO2332',
    // USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 (Circle testnet issuer)
    USDC_SAC:        'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
  },
  MAINNET: {
    TREASURY_VAULT:  '',
    STREAMING:       '',
    PROOF_REGISTRY:  '',
    // USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN (Circle)
    USDC_SAC:        'CCW67TSZV3SSS2HXMBQ5JFGCKJNOOKOXAPZDMILQWDPZLMAQYRD55BH',
  },
};

const CONTRACT_ID_RE = /^C[A-Z2-7]{55}$/;

export interface ResolvedConfig {
  network: Network;
  config: NetworkConfig;
  contracts: ContractSet;
}

type Env = Record<string, string | undefined>;

/**
 * Resolves the active network, RPC endpoints and contract IDs from VITE_*
 * env values. Pure, so the Vite config and tests can call it with any env.
 * Throws on values that are set but invalid, so a typo fails the build
 * instead of silently pointing the app at the wrong contracts.
 */
export function resolveConfig(env: Env): ResolvedConfig {
  const rawNetwork = (env.VITE_STELLAR_NETWORK ?? '').trim().toUpperCase();
  if (rawNetwork && rawNetwork !== 'TESTNET' && rawNetwork !== 'MAINNET') {
    throw new Error(`VITE_STELLAR_NETWORK must be TESTNET or MAINNET, got "${env.VITE_STELLAR_NETWORK}"`);
  }
  const network: Network = rawNetwork === 'MAINNET' ? 'MAINNET' : 'TESTNET';

  const rpcOverride = (env.VITE_SOROBAN_RPC_URL ?? '').trim();
  if (rpcOverride && !/^https:\/\//.test(rpcOverride)) {
    throw new Error('VITE_SOROBAN_RPC_URL must be an https:// URL');
  }

  const contractId = (key: string, fallback: string): string => {
    const value = (env[key] ?? '').trim();
    if (!value) return fallback;
    if (!CONTRACT_ID_RE.test(value)) throw new Error(`${key} is not a Stellar contract id (C...): "${value}"`);
    return value;
  };

  const defaults = CONTRACT_IDS[network];
  return {
    network,
    config: {
      ...NETWORK_CONFIG[network],
      sorobanRpcUrl: rpcOverride || NETWORK_CONFIG[network].sorobanRpcUrl,
    },
    contracts: {
      TREASURY_VAULT: contractId('VITE_TREASURY_VAULT_CONTRACT_ID', defaults.TREASURY_VAULT),
      STREAMING:      contractId('VITE_STREAMING_CONTRACT_ID', defaults.STREAMING),
      PROOF_REGISTRY: contractId('VITE_PROOF_REGISTRY_CONTRACT_ID', defaults.PROOF_REGISTRY),
      USDC_SAC:       defaults.USDC_SAC,
    },
  };
}

// import.meta.env is undefined when this module is loaded by vite.config.ts.
const RESOLVED = resolveConfig((import.meta.env ?? {}) as Env);

/** Active network, from VITE_STELLAR_NETWORK (defaults to TESTNET). */
export const ACTIVE_NETWORK: Network = RESOLVED.network;

export const activeConfig = (): NetworkConfig => RESOLVED.config;
export const activeContracts = (): ContractSet => RESOLVED.contracts;

/** The active Soroban RPC URL; throws if none is configured (MAINNET without VITE_SOROBAN_RPC_URL). */
export const activeRpcUrl = (): string => {
  if (!RESOLVED.config.sorobanRpcUrl) {
    throw new Error(`No Soroban RPC URL configured for ${ACTIVE_NETWORK} — set VITE_SOROBAN_RPC_URL.`);
  }
  return RESOLVED.config.sorobanRpcUrl;
};

/** 1 USDC = 10_000_000 stroops (7 decimal places on Stellar). */
export const STROOPS_PER_USDC = 10_000_000n;

/** Seconds in a 30-day month — used for flow-rate conversion. */
export const SECONDS_PER_MONTH = 2_592_000n;
