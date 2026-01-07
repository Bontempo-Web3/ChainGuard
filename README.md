# ChainGuard Scanner

**Automated security scanning for Solidity smart contracts.** Multi-tool analysis combining Slither, Aderyn, Echidna, and Claude Mini-Audit.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)

## Overview

ChainGuard Scanner provides comprehensive security analysis for smart contracts using multiple industry-standard tools and AI-powered auditing.

### Key Features

- **Multi-Tool Analysis** - Combines Slither, Aderyn, Echidna, and Claude Mini-Audit
- **Automated Scanning** - FastAPI service for programmatic access
- **Severity Classification** - Critical, High, Medium, Low vulnerability categorization
- **Claude Mini-Audit** - AI-powered 10-step professional audit
- **Cost Effective** - ~$0.12 per scan with intelligent caching
- **Docker Ready** - Fully containerized for easy deployment

## Scanner Tools

### 1. Slither
- Fast static analysis with 165+ detectors
- Detects common vulnerabilities and code quality issues
- Optimized for Solidity

### 2. Aderyn
- Modern Rust-based analysis
- 17 critical vulnerability detectors
- Fast and efficient

### 3. Echidna
- Automated property-based fuzzing
- Generates 10,000+ test cases
- Finds edge cases and unexpected behaviors

### 4. Claude Mini-Audit
- AI-powered architectural analysis
- 10-step professional audit process
- Business logic vulnerability detection
- Threat modeling and recommendations

## Quick Start

### Prerequisites

- **Docker 24.0+** and **Docker Compose 2.20+**
- **Git**
- At least **8GB** of free disk space
- **Anthropic API Key** (optional, for Claude Mini-Audit)

### Installation

#### Step 1: Clone the Repository
```bash
git clone https://github.com/Bontempo-Web3/ChainGuard.git
cd ChainGuard
```

#### Step 2: Install Contract Dependencies (if using example contracts)

```bash
cd contracts/examples
forge install OpenZeppelin/openzeppelin-contracts
cd ../..
```

#### Step 3: Configure Environment Variables
```bash
# Optional: For Claude Mini-Audit
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
```

#### Step 4: Build and Start Scanner
```bash
docker-compose up --build scanner
```

The scanner will be available at `http://localhost:8001`

## Usage

### Scan a Contract File

```bash
curl -X POST http://localhost:8001/scan-file \
  -F "file=@path/to/contract.sol"
```

### Scan a Directory

```bash
curl -X POST http://localhost:8001/scan-directory \
  -F "directory=@path/to/contracts/"
```

### API Endpoints

- `POST /scan-file` - Scan a single Solidity file
- `POST /scan-directory` - Scan all contracts in a directory
- `GET /health` - Health check endpoint

## Project Structure

```
ChainGuard/
├── scanner/
│   ├── main.py                    # FastAPI service
│   ├── scanner_orchestrator.py   # Coordinates all scanners
│   ├── slither_scanner.py        # Slither integration
│   ├── aderyn_scanner.py         # Aderyn integration
│   ├── echidna_scanner.py        # Echidna integration
│   ├── claude_scanner.py         # Claude Mini-Audit
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile                # Scanner container
├── docker-compose.yml            # Docker orchestration
└── README.md                     # This file
```

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY` - Required for Claude Mini-Audit (optional)
- `PORT` - Scanner service port (default: 8001)

## Development

### Running Tests

```bash
cd scanner
python test_pipeline.py
```

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
