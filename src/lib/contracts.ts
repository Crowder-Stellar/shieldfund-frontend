/**
 * Network configuration and contract IDs for ShieldFund.
 *
 * After running contracts/scripts/deploy-testnet.sh, paste the printed
 * contract IDs into CONTRACT_IDS.TESTNET below.
 *
 * This file is the only place network-specific constants live — the rest of
 * src/lib/stellar.ts reads from here so switching networks is one-liner.
 */

export type Network = 'TESTNET' | 'MAINNET';

export interface NetworkConfig {
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
    sorobanRpcUrl:      'https://mainnet.stellar.validationcloud.io/v1/xycnK2RZ9BoYBULsT5BYm0E2NmGbRZhe',
    horizonUrl:         'https://horizon.stellar.org',
    networkPassphrase:  'Public Global Stellar Network ; September 2015',
  },
};

export interface ContractSet {
  TREASURY_VAULT:  string;
  STREAMING:       string;
  PROOF_REGISTRY:  string;
  /** USDC Stellar Asset Contract (SAC). Already deployed by Circle. */
  USDC_SAC:        string;
}

/**
 * Fill TESTNET values after running contracts/scripts/deploy-testnet.sh.
 * MAINNET stays empty until you're ready to go live.
 */
export const CONTRACT_IDS: Record<Network, ContractSet> = {
  TESTNET: {
    TREASURY_VAULT:  '',   // paste after deploy
    STREAMING:       '',   // paste after deploy
    PROOF_REGISTRY:  '',   // paste after deploy
    USDC_SAC:        'CBIELTK6YBZJU5UP2WWQEQZMYJMZROFZKYPVCCNWY5TU4BOQ3EOWXPD',
  },
  MAINNET: {
    TREASURY_VAULT:  '',
    STREAMING:       '',
    PROOF_REGISTRY:  '',
    USDC_SAC:        'CCW67TSZV3SSS2HXMBQ5JFGCKJNOOKOXAPZDMILQWDPZLMAQYRD55BH',
  },
};

/** Active network — flip to MAINNET for production. */
export const ACTIVE_NETWORK: Network = 'TESTNET';

export const activeConfig  = () => NETWORK_CONFIG[ACTIVE_NETWORK];
export const activeContracts = () => CONTRACT_IDS[ACTIVE_NETWORK];

/** 1 USDC = 10_000_000 stroops (7 decimal places on Stellar). */
export const STROOPS_PER_USDC = 10_000_000n;

/** Seconds in a 30-day month — used for flow-rate conversion. */
export const SECONDS_PER_MONTH = 2_592_000n;
