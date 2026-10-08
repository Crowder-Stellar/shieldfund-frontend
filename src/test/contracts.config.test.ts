import { describe, it, expect } from 'vitest';
import {
  NETWORK_CONFIG,
  CONTRACT_IDS,
  ACTIVE_NETWORK,
  activeConfig,
  activeContracts,
  resolveConfig,
} from '../lib/contracts';

describe('NETWORK_CONFIG', () => {
  it('testnet has the correct Soroban RPC URL', () => {
    expect(NETWORK_CONFIG.TESTNET.sorobanRpcUrl).toBe('https://soroban-testnet.stellar.org');
  });

  it('testnet has the correct Horizon URL', () => {
    expect(NETWORK_CONFIG.TESTNET.horizonUrl).toBe('https://horizon-testnet.stellar.org');
  });

  it('testnet passphrase includes "Test SDF Network"', () => {
    expect(NETWORK_CONFIG.TESTNET.networkPassphrase).toContain('Test SDF Network');
  });

  it('mainnet passphrase includes "Public Global Stellar Network"', () => {
    expect(NETWORK_CONFIG.MAINNET.networkPassphrase).toContain('Public Global Stellar Network');
  });
});

describe('CONTRACT_IDS', () => {
  it('testnet USDC SAC is a non-empty Stellar contract address starting with C', () => {
    const addr = CONTRACT_IDS.TESTNET.USDC_SAC;
    expect(addr.length).toBeGreaterThan(0);
    expect(addr[0]).toBe('C');
    // Strkey alphabet: A-Z and 2-7 only (no 0, 1, 8, 9)
    expect(addr).toMatch(/^[A-Z2-7]+$/);
  });

  it('testnet USDC SAC is Circle USDC, not the native XLM contract', () => {
    expect(CONTRACT_IDS.TESTNET.USDC_SAC).toBe('CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA');
    expect(CONTRACT_IDS.TESTNET.USDC_SAC).not.toBe('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC');
  });

  it('no RPC URL in source embeds an API key', () => {
    for (const net of Object.values(NETWORK_CONFIG)) {
      expect(net.sorobanRpcUrl).not.toMatch(/\/v1\/[A-Za-z0-9]{20,}/);
    }
  });

  it('mainnet USDC SAC is a different address from testnet', () => {
    expect(CONTRACT_IDS.MAINNET.USDC_SAC).not.toBe(CONTRACT_IDS.TESTNET.USDC_SAC);
  });
});

describe('activeConfig / activeContracts', () => {
  it('activeConfig() returns the ACTIVE_NETWORK endpoints', () => {
    expect(activeConfig().networkPassphrase).toBe(NETWORK_CONFIG[ACTIVE_NETWORK].networkPassphrase);
    expect(activeConfig().horizonUrl).toBe(NETWORK_CONFIG[ACTIVE_NETWORK].horizonUrl);
  });

  it('activeContracts() returns valid contract ids for the active network', () => {
    for (const id of [activeContracts().TREASURY_VAULT, activeContracts().STREAMING, activeContracts().PROOF_REGISTRY]) {
      expect(id).toMatch(/^C[A-Z2-7]{55}$/);
    }
  });

  it('ACTIVE_NETWORK is TESTNET (pre-deploy safety check)', () => {
    // Ensures we never accidentally deploy to mainnet without deliberate change
    expect(ACTIVE_NETWORK).toBe('TESTNET');
  });
});

describe('resolveConfig (VITE_* env)', () => {
  const VAULT = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';

  it('defaults to the testnet deployment when nothing is set', () => {
    const r = resolveConfig({});
    expect(r.network).toBe('TESTNET');
    expect(r.contracts).toEqual(CONTRACT_IDS.TESTNET);
    expect(r.config).toEqual(NETWORK_CONFIG.TESTNET);
  });

  it('uses contract ids from env when provided', () => {
    const r = resolveConfig({ VITE_TREASURY_VAULT_CONTRACT_ID: ` ${VAULT} ` });
    expect(r.contracts.TREASURY_VAULT).toBe(VAULT);
    expect(r.contracts.STREAMING).toBe(CONTRACT_IDS.TESTNET.STREAMING);
  });

  it('selects mainnet from VITE_STELLAR_NETWORK (case-insensitive)', () => {
    const r = resolveConfig({ VITE_STELLAR_NETWORK: 'mainnet', VITE_SOROBAN_RPC_URL: 'https://rpc.example.org' });
    expect(r.network).toBe('MAINNET');
    expect(r.config.networkPassphrase).toContain('Public Global');
    expect(r.config.sorobanRpcUrl).toBe('https://rpc.example.org');
    expect(r.contracts.USDC_SAC).toBe(CONTRACT_IDS.MAINNET.USDC_SAC);
  });

  it('mainnet has no RPC unless one is configured', () => {
    expect(resolveConfig({ VITE_STELLAR_NETWORK: 'MAINNET' }).config.sorobanRpcUrl).toBe('');
  });

  it('rejects invalid values instead of silently falling back', () => {
    expect(() => resolveConfig({ VITE_STELLAR_NETWORK: 'FUTURENET' })).toThrow(/TESTNET or MAINNET/);
    expect(() => resolveConfig({ VITE_STREAMING_CONTRACT_ID: 'CABC' })).toThrow(/VITE_STREAMING_CONTRACT_ID/);
    expect(() => resolveConfig({ VITE_SOROBAN_RPC_URL: 'http://insecure.example' })).toThrow(/https/);
  });
});
