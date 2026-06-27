import { describe, it, expect } from 'vitest';
import {
  NETWORK_CONFIG,
  CONTRACT_IDS,
  ACTIVE_NETWORK,
  activeConfig,
  activeContracts,
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

  it('mainnet USDC SAC is a different address from testnet', () => {
    expect(CONTRACT_IDS.MAINNET.USDC_SAC).not.toBe(CONTRACT_IDS.TESTNET.USDC_SAC);
  });
});

describe('activeConfig / activeContracts', () => {
  it('activeConfig() returns the ACTIVE_NETWORK config', () => {
    expect(activeConfig()).toBe(NETWORK_CONFIG[ACTIVE_NETWORK]);
  });

  it('activeContracts() returns the ACTIVE_NETWORK contract set', () => {
    expect(activeContracts()).toBe(CONTRACT_IDS[ACTIVE_NETWORK]);
  });

  it('ACTIVE_NETWORK is TESTNET (pre-deploy safety check)', () => {
    // Ensures we never accidentally deploy to mainnet without deliberate change
    expect(ACTIVE_NETWORK).toBe('TESTNET');
  });
});
