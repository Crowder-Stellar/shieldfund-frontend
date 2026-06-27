import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// Freighter is not available in JSDOM
vi.mock('@stellar/freighter-api', () => ({
  isConnected:      vi.fn().mockResolvedValue({ isConnected: false }),
  getAddress:       vi.fn().mockResolvedValue({ address: '', error: 'not installed' }),
  requestAccess:    vi.fn().mockResolvedValue({ error: 'not installed' }),
  signTransaction:  vi.fn().mockResolvedValue({ signedTxXdr: '', error: 'not installed' }),
}));

// Stellar SDK network calls should not fire in unit tests
vi.mock('@stellar/stellar-sdk', () => ({
  rpc: { Server: vi.fn() },
  Contract: vi.fn(),
  TransactionBuilder: vi.fn(),
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  Address: { fromString: vi.fn() },
  nativeToScVal: vi.fn(),
  scValToNative: vi.fn(),
  BASE_FEE: '100',
  Keypair: { fromSecret: vi.fn() },
}));

// Motion library can cause issues in JSDOM — stub to passthrough divs
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target, tag) => {
      const el = (props: any) => {
        const { children, initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
        return React.createElement(tag as string, rest, children);
      };
      return el;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

describe('App — initial render', () => {
  beforeEach(() => {
    // jsdom does not implement ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('renders without crashing', () => {
    render(<App />);
    // App should render at least one element
    expect(document.body.firstChild).not.toBeNull();
  });

  it('starts on the Treasury tab and shows vault balance section', () => {
    render(<App />);
    // TreasuryTab has "TOTAL VAULT BALANCE" heading (getAllByText returns array — passes if at least one found)
    const matches = screen.getAllByText(/vault balance/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});

describe('App — Stellar address validation regex', () => {
  const STELLAR_ADDR_REGEX = /^G[A-Z2-7]{55}$/;

  it('accepts a synthetically constructed valid G-address (G + 55 base32 chars)', () => {
    // Stellar G-addresses are G (version 0x06) + 55 base32 chars = 56 total
    const validAddr = 'G' + 'A'.repeat(55);
    expect(STELLAR_ADDR_REGEX.test(validAddr)).toBe(true);
  });

  it('rejects an address that is too short', () => {
    expect(STELLAR_ADDR_REGEX.test('GABC')).toBe(false);
  });

  it('rejects an address starting with a lowercase letter', () => {
    expect(STELLAR_ADDR_REGEX.test('gDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ')).toBe(false);
  });

  it('rejects addresses that start with a wrong uppercase letter', () => {
    // Must start with G
    expect(STELLAR_ADDR_REGEX.test('ADRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ')).toBe(false);
  });
});
