# ZapArena

Social wager gaming platform on Starknet. Challenge players to Coin Flip, Rock Paper Scissors, and Price Prediction games with real crypto stakes.

Built with [Starkzap SDK](https://starkzap.io), [Cartridge Controller](https://cartridge.gg), and Cairo smart contracts on Starknet Sepolia.

## Tech Stack

- **Frontend:** Next.js 16, Tailwind CSS, Framer Motion
- **Wallet:** Cartridge Controller (gasless, session keys)
- **SDK:** Starkzap (token operations)
- **Contract:** Cairo (escrow, commit-reveal, leaderboard)
- **Network:** Starknet Sepolia testnet

## Prerequisites

- Node.js 18+
- npm
- [Scarb](https://docs.swmansion.com/scarb/) (for Cairo contracts)
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) (`sncast` for deployment)

## Quick Start

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Set up environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values (see Environment Variables below).

### 3. Run the dev server

**HTTP (simple, but Cartridge wallet won't work due to mixed content):**

```bash
npm run dev
```

**HTTPS (required for Cartridge Controller):**

```bash
# Install local-ssl-proxy (one time)
npm install -g local-ssl-proxy

# Terminal 1: Start Next.js on port 3001
npx next dev --port 3001

# Terminal 2: Start HTTPS proxy on port 3000
local-ssl-proxy --source 3000 --target 3001
```

Then open **https://localhost:3000** (accept the self-signed cert warning).

### 4. Build Cairo contracts (optional)

```bash
cd contracts
scarb build
```

### 5. Deploy contracts to Sepolia (optional)

```bash
# Create and fund a deployer account
sncast account create --url https://api.cartridge.gg/x/starknet/sepolia --name deployer
# Fund the address with STRK from https://starknet-faucet.vercel.app/
sncast account deploy --url https://api.cartridge.gg/x/starknet/sepolia --name deployer

# Declare the contract class
sncast -a deployer declare --url https://api.cartridge.gg/x/starknet/sepolia --contract-name ZapArenaEscrow

# Deploy with your deployer address as the owner (resolver)
sncast -a deployer deploy --url https://api.cartridge.gg/x/starknet/sepolia \
  --class-hash <CLASS_HASH> \
  --arguments <DEPLOYER_ADDRESS>
```

Update `NEXT_PUBLIC_ESCROW_CONTRACT` in `.env.local` with the deployed address.

## Environment Variables

```bash
# Deployed escrow contract address on Sepolia
NEXT_PUBLIC_ESCROW_CONTRACT=0x01bce95aee73eda33a7c8f3879a06730517a1d5d14e31e07372858b5bfb53fb9

# Base URL for the app
NEXT_PUBLIC_BASE_URL=https://localhost:3000

# Server wallet for resolving games on-chain (deployer account)
SERVER_WALLET_ADDRESS=0x...
SERVER_WALLET_PRIVATE_KEY=0x...

# Starknet RPC
STARKNET_RPC_URL=https://api.cartridge.gg/x/starknet/sepolia
```

## Project Structure

```
zaparena/
├── contracts/              # Cairo smart contract (escrow)
│   ├── Scarb.toml
│   └── src/
│       ├── lib.cairo
│       └── escrow.cairo    # Game escrow: create, join, resolve, cancel, RPS commit-reveal
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout + providers
│   │   ├── page.tsx        # Game lobby
│   │   ├── providers.tsx   # StarknetConfig + Cartridge
│   │   ├── create/         # Create game page
│   │   ├── game/[id]/      # Individual game page
│   │   ├── leaderboard/    # Leaderboard page
│   │   └── api/            # API routes (games, price, leaderboard)
│   ├── components/         # UI components
│   │   ├── Navbar.tsx
│   │   ├── ConnectButton.tsx
│   │   ├── GameLobby.tsx
│   │   ├── GameCard.tsx
│   │   ├── CoinFlipGame.tsx
│   │   ├── RPSGame.tsx
│   │   ├── PricePredictionGame.tsx
│   │   ├── GameResult.tsx
│   │   └── Leaderboard.tsx
│   └── lib/
│       ├── constants.ts    # Contract addresses, ABIs
│       ├── cartridge.ts    # Cartridge Controller + session policies
│       ├── types.ts        # TypeScript types
│       ├── db.ts           # In-memory game store
│       └── resolver.ts     # Server-side game resolution (calls contract)
└── .env.local
```

## How It Works

### On-chain (Cairo escrow contract)

| Action | Who | What happens |
|---|---|---|
| `approve` + `create_game` | Player 1 | Tokens deposited into escrow |
| `approve` + `join_game` | Player 2 | Matching tokens deposited |
| `commit_move` / `reveal_move` | Both (RPS) | Poseidon hash commit-reveal |
| `resolve_game` | Server wallet | Winner receives 2x wager |
| `cancel_game` | Creator | Refund if no opponent |

### Off-chain (Next.js API)

- Game metadata, RPS state tracking, price prediction timers
- Server determines winner (random for coin flip, RPS logic, price comparison)
- Server wallet calls `resolve_game` on-chain to pay the winner

## Game Modes

- **Coin Flip** -- Pure luck. Resolved instantly when opponent joins.
- **Rock Paper Scissors** -- Commit-reveal scheme. Both players commit hashed moves, then reveal.
- **Price Prediction** -- Bet on BTC/ETH/STRK price direction over 1-5 minutes.

## Deployed Contract (Sepolia)

- **Contract:** [`0x01bce95aee73eda33a7c8f3879a06730517a1d5d14e31e07372858b5bfb53fb9`](https://sepolia.voyager.online/contract/0x01bce95aee73eda33a7c8f3879a06730517a1d5d14e31e07372858b5bfb53fb9)
- **Class Hash:** `0x1ebd84f67d7bd887f781ded4cd1d3f93b3ee76b8207c3fbcfd822790b199b0a`
