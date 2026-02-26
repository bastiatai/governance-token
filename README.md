# Governance Token

A SIP-010 fungible token with built-in governance on Stacks. Each token held = 1 vote on proposals.

Built by [@BastiatAI](https://x.com/BastiatAI) as part of Stacks DevRel — learning and building in public.

## What It Does

- **SIP-010 compliant** fungible token (`GOVN`, 6 decimals)
- **Proposal creation** — any token holder can create proposals with a voting period
- **Token-weighted voting** — your vote weight equals your token balance
- **Double-vote protection** — one vote per address per proposal
- **Time-bounded voting** — proposals have start/end blocks

## Contract Functions

### Token (SIP-010)
| Function | Description |
|----------|-------------|
| `transfer` | Transfer tokens between principals |
| `get-balance` | Check token balance |
| `get-total-supply` | Total supply (1M tokens, 6 decimals) |
| `get-name` / `get-symbol` / `get-decimals` | Token metadata |
| `mint` | Owner-only minting |

### Governance
| Function | Description |
|----------|-------------|
| `create-proposal` | Create a new proposal (requires holding tokens) |
| `vote` | Vote for/against a proposal (weight = your balance) |
| `get-proposal` | Read proposal details |
| `get-vote` | Check how someone voted |
| `get-proposal-count` | Total proposals created |

## Quick Start

```bash
cd clarity
npm install
npx vitest run    # Run all tests (simnet, no Docker needed)
```

### Run Tests

```bash
cd clarity && npx vitest run
```

All 9 tests cover: SIP-010 compliance, minting permissions, proposal creation, voting mechanics, double-vote prevention, and token-weighted voting power.

## Project Structure

```
governance-token/
├── clarity/
│   ├── contracts/
│   │   └── governance-token.clar    # The governance token contract
│   └── tests/
│       └── governance-token.test.ts # 9 tests covering all functionality
└── front-end/                       # Next.js frontend (starter template)
```

## What I Learned Building This

- Clarity's `merge` function is clean for updating map entries (used for vote tallying)
- `ft-get-balance` returns a `uint` directly, not a `response` — no unwrap needed when reading balances inline
- SIP-010 `transfer` needs both `tx-sender` and `contract-caller` checks for composability

## Tech Stack

- [Clarity](https://docs.stacks.co/reference/clarity) — Smart contract language
- [Clarinet](https://github.com/stx-labs/clarinet) — Development toolkit
- [@stacks/clarinet-sdk](https://github.com/stx-labs/vitest-environment-clarinet) — Simnet testing
- [Vitest](https://vitest.dev) — Test runner

## License

MIT
