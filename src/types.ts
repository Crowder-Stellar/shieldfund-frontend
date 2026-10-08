export interface Campaign {
  id: string;
  title: string;
  description: string;
  raised: number;
  goal: number;
  image: string;
  zkVerified: boolean;
}

export interface Milestone {
  name: string;
  date: string;
  status: 'met' | 'pending';
}

export interface MilestoneVesting {
  id: string;
  title: string;
  description: string;
  metCount: number;
  totalCount: number;
  progressPercent: number;
  milestones: Milestone[];
}

export interface Stream {
  id: string;
  title: string;
  recipient: string;
  accumulatedValue: number;
  flowRateAmount: number;
  endDate: string;
  status: 'ACTIVE' | 'PAUSED';
}

/** What the Launch Campaign form collects. */
export interface NewCampaignInput {
  title: string;
  description: string;
  goalUsdc: number;
  /** https:// cover image, or empty for the default. */
  imageUrl: string;
}

/** What the Create Stream form collects. */
export interface NewStreamInput {
  title: string;
  /** Full Stellar G... address. */
  recipient: string;
  flowRateMonthly: number;
  /** ISO date, YYYY-MM-DD. */
  endDate: string;
}

export interface VerifiableProof {
  id: string;
  title: string;
  hash: string;
  date: string;
  complexity: number; // 1, 2, or 3 bars
  status: 'VERIFIED' | 'PENDING';
  type: 'payroll' | 'operational' | 'relief';
}

export interface Transaction {
  id: string;
  type: 'Inflow' | 'Outflow';
  title: string;
  txHash: string;
  senderReceiver: string;
  amount: number;
  time: string;
  category: 'Operational' | 'Investment' | 'Grant' | 'Other';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'CAMPAIGN_LAUNCH' | 'STREAM_CREATE' | 'STREAM_TOGGLE' | 'PROOF_VERIFY' | 'DEPOSIT' | 'DISBURSE' | 'WALLET_CONNECT' | 'WALLET_DISCONNECT';
  details: string;
  actor: string;
  txHash?: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
}

export interface TreasuryData {
  vaultBalance: number;
  totalRaised: number;
  totalDisbursed: number;
  lastAuditTime: string;
}
