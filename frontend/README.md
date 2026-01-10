# ChainGuard Frontend

Dashboard for smart contract security: Scan, Deploy, and Monitor.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Wagmi v2** - Wallet connection (uses viem internally)
- **ethers.js** - Ethereum interactions
- **Lucide React** - Icons

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with Sidebar
│   │   ├── page.tsx            # Home - Upload/GitHub login
│   │   ├── globals.css         # Global styles (dark theme)
│   │   ├── scan/
│   │   │   └── page.tsx        # Security Scanner UI
│   │   ├── deploy/
│   │   │   └── page.tsx        # Secure Deploy UI
│   │   └── monitor/
│   │       └── page.tsx        # Contract Monitor UI
│   ├── components/
│   │   └── layout/
│   │       └── Sidebar.tsx     # Navigation sidebar
│   └── lib/
│       └── utils.ts            # Utility functions
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## Pages

### Home (`/`)
- Upload Solidity files or folders
- Connect GitHub to import repositories
- View latest projects table

### Scan (`/scan`)
- Upload contracts for security analysis
- Runs Slither, Aderyn, Echidna, Claude Mini-Audit
- Displays findings by severity (Critical, High, Medium, Low)

### Deploy (`/deploy`)
- Connect wallet via Wagmi
- Pre-deployment security validation
- Deploy with ethers.js
- Etherscan verification

### Monitor (`/monitor`)
- Real-time contract event monitoring
- Powered by Alchemy Notify webhooks
- Live event feed with Socket.io
- Alert system for critical events

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Access at **http://localhost:3001**

## Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```
