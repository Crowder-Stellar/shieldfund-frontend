import { describe, it, expect } from 'vitest';
import { usdcToStroops, stroopsToUsdc, monthlyToPerSecond } from '../lib/stellar';
import { STROOPS_PER_USDC, SECONDS_PER_MONTH } from '../lib/contracts';

describe('usdcToStroops', () => {
  it('converts 1 USDC to 10_000_000 stroops', () => {
    expect(usdcToStroops(1)).toBe(10_000_000n);
  });

  it('converts 5000 USDC correctly', () => {
    expect(usdcToStroops(5000)).toBe(50_000_000_000n);
  });

  it('rounds fractional USDC amounts', () => {
    // 1.5 USDC → 15_000_000 stroops exactly
    expect(usdcToStroops(1.5)).toBe(15_000_000n);
  });

  it('returns 0n for 0 USDC', () => {
    expect(usdcToStroops(0)).toBe(0n);
  });
});

describe('stroopsToUsdc', () => {
  it('converts 10_000_000 stroops back to 1 USDC', () => {
    expect(stroopsToUsdc(10_000_000n)).toBeCloseTo(1, 5);
  });

  it('is the inverse of usdcToStroops for round amounts', () => {
    const amounts = [100, 500, 1000, 25000, 100000];
    for (const amt of amounts) {
      expect(stroopsToUsdc(usdcToStroops(amt))).toBeCloseTo(amt, 5);
    }
  });

  it('returns 0 for 0n stroops', () => {
    expect(stroopsToUsdc(0n)).toBe(0);
  });
});

describe('monthlyToPerSecond', () => {
  it('computes a positive per-second rate for positive monthly amounts', () => {
    expect(monthlyToPerSecond(1000) > 0n).toBe(true);
  });

  it('applies ceiling division (never rounds down to zero for small amounts)', () => {
    // 1 USDC/month = 10_000_000 stroops / 2_592_000 seconds ≈ 3.86 stroops/sec → rounds up to 4
    const rate = monthlyToPerSecond(1);
    // Ceiling of 10_000_000 / 2_592_000 = ceil(3.858...) = 4
    expect(rate).toBe(4n);
  });

  it('returns 0n for 0 monthly rate', () => {
    expect(monthlyToPerSecond(0)).toBe(0n);
  });

  it('per-second × SECONDS_PER_MONTH is within 1 USDC of the original monthly amount', () => {
    const monthly = 5000;
    const perSec  = monthlyToPerSecond(monthly);
    const reconstructed = stroopsToUsdc(perSec * SECONDS_PER_MONTH);
    // Ceiling div means reconstructed >= monthly and <= monthly + tiny rounding
    expect(reconstructed).toBeGreaterThanOrEqual(monthly);
    expect(reconstructed - monthly).toBeLessThan(1);
  });
});

describe('contracts.ts constants', () => {
  it('STROOPS_PER_USDC is exactly 10_000_000n', () => {
    expect(STROOPS_PER_USDC).toBe(10_000_000n);
  });

  it('SECONDS_PER_MONTH is 30 * 24 * 3600 = 2_592_000', () => {
    expect(SECONDS_PER_MONTH).toBe(2_592_000n);
    expect(SECONDS_PER_MONTH).toBe(BigInt(30 * 24 * 60 * 60));
  });
});
