import { Campaign, MilestoneVesting, Stream, VerifiableProof, Transaction, TreasuryData, AuditLogEntry } from './types';

export const initialCampaigns: Campaign[] = [
  {
    id: 'c1',
    title: 'Global Privacy Team Payroll',
    description: 'Securing ongoing development for core ZK-privacy primitives across the ecosystem.',
    raised: 25000,
    goal: 50000,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=600&auto=format&fit=crop',
    zkVerified: true
  },
  {
    id: 'c2',
    title: 'Stellar Dev Grants',
    description: 'Incentivizing the next generation of builders for private DeFi integrations.',
    raised: 80000,
    goal: 100000,
    image: 'https://images.unsplash.com/photo-1644024312954-4625a31b411a?q=80&w=600&auto=format&fit=crop',
    zkVerified: true
  }
];

export const initialVesting: MilestoneVesting[] = [
  {
    id: 'v1',
    title: 'Q1 Milestone Vesting',
    description: 'Institutional Core Infrastructure Development',
    metCount: 2,
    totalCount: 3,
    progressPercent: 66,
    milestones: [
      { name: 'Privacy Shield v1.0', date: 'JAN 15', status: 'met' },
      { name: 'ZK-Proof Aggregator', date: 'FEB 02', status: 'met' },
      { name: 'Multi-sig Integration', date: 'PENDING', status: 'pending' }
    ]
  }
];

export const initialStreams: Stream[] = [
  {
    id: 's1',
    title: 'Dev Salary Stream',
    recipient: '0x71C...4f2E',
    accumulatedValue: 4281.9688,
    flowRateAmount: 5000, // USDC per month
    endDate: 'Dec 31, 2024',
    status: 'ACTIVE'
  }
];

export const initialProofs: VerifiableProof[] = [
  {
    id: 'p1',
    title: 'Total Payroll Disbursement Proof - Feb 2024',
    hash: '0x21b...ae91',
    date: '12.02.2024',
    complexity: 2,
    status: 'VERIFIED',
    type: 'payroll'
  },
  {
    id: 'p2',
    title: 'Operational Expense Proof - Q1 Reserve',
    hash: '0x9f2...bc10',
    date: '10.02.2024',
    complexity: 3,
    status: 'VERIFIED',
    type: 'operational'
  },
  {
    id: 'p3',
    title: 'Emergency Relief Fund Distribution',
    hash: 'Pending Generation',
    date: '08.02.2024',
    complexity: 1,
    status: 'PENDING',
    type: 'relief'
  }
];

export const initialTransactions: Transaction[] = [
  {
    id: 't1',
    type: 'Inflow',
    title: 'Inflow: Global Relief Campaign',
    txHash: '0x4f...a89e',
    senderReceiver: 'Private Donor',
    amount: 12400,
    time: '14:22 UTC',
    category: 'Grant'
  },
  {
    id: 't2',
    type: 'Outflow',
    title: 'Outflow: Recurring Operational Stream',
    txHash: '0x92...3b12',
    senderReceiver: 'Verified Recipient',
    amount: 4500,
    time: '11:05 UTC',
    category: 'Operational'
  },
  {
    id: 't3',
    type: 'Inflow',
    title: 'Inflow: Clean Water Initiative',
    txHash: '0xbb...71dd',
    senderReceiver: 'Institutional Partner',
    amount: 25000,
    time: 'Yesterday',
    category: 'Investment'
  }
];

export const initialTreasury: TreasuryData = {
  vaultBalance: 150000,
  totalRaised: 248500,
  totalDisbursed: 98500,
  lastAuditTime: '2 mins ago'
};

export const initialAuditLogs: AuditLogEntry[] = [
  {
    id: 'log1',
    timestamp: '2026-06-26 14:22:15 UTC',
    action: 'DEPOSIT',
    details: 'ZK Deposit of 12,400 USDC confirmed into safe vault.',
    actor: 'Admin (0x92f...3b12)',
    txHash: '0x4f...a89e',
    severity: 'success',
  },
  {
    id: 'log2',
    timestamp: '2026-06-26 11:05:40 UTC',
    action: 'DISBURSE',
    details: 'Sovereign disbursement of 4,500 USDC processed for verified recipient.',
    actor: 'DAO Voter (0xc4e...71fa)',
    txHash: '0x92...3b12',
    severity: 'success',
  },
  {
    id: 'log3',
    timestamp: '2026-06-25 18:30:12 UTC',
    action: 'PROOF_VERIFY',
    details: 'Milestone completion ZK proof validated: "Global Privacy Team Payroll" (Q2 Report).',
    actor: 'System Verifier (0xzk...88aa)',
    txHash: '0xbb...71dd',
    severity: 'success',
  },
  {
    id: 'log4',
    timestamp: '2026-06-25 09:15:00 UTC',
    action: 'STREAM_TOGGLE',
    details: 'Vesting stream "Core Protocol Engineering" paused temporarily pending milestone review.',
    actor: 'Admin (0x92f...3b12)',
    severity: 'warning',
  },
  {
    id: 'log5',
    timestamp: '2026-06-24 16:45:22 UTC',
    action: 'STREAM_CREATE',
    details: 'Vesting stream "Decentralized Storage Grant" established. Flow rate: 0.05 USDC/sec.',
    actor: 'DAO Voter (0xc4e...71fa)',
    severity: 'info',
  },
  {
    id: 'log6',
    timestamp: '2026-06-23 10:10:05 UTC',
    action: 'CAMPAIGN_LAUNCH',
    details: 'Sovereign Campaign "Clean Water Initiative" launched. Goal set to 250,000 USDC.',
    actor: 'Admin (0x92f...3b12)',
    severity: 'info',
  },
];

