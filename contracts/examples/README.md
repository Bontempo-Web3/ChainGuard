# ChainGuard Example Contracts

This directory contains example Solidity contracts for testing ChainGuard's security scanning capabilities.

## Overview

These contracts demonstrate various vulnerability patterns that ChainGuard can detect:

- **Counter.sol** - Simple counter contract (baseline)
- **SecureVault.sol** - Well-written vault with security best practices
- **VulnerableVault.sol** - Vault with reentrancy vulnerability
- **VulnerableToken.sol** - ERC20 token with multiple vulnerabilities
- **VulnerableAuth.sol** - Authentication bypass vulnerabilities
- **VulnerableDelegateCall.sol** - Delegatecall misuse patterns
- **VulnerableExternalCall.sol** - External call vulnerabilities
- **MathVulnerable.sol** - Integer overflow/underflow issues
- **FuzzOnlyVulnerable.sol** - Vulnerabilities only detectable by fuzzing
- **Attacker.sol** - Example attack contract

## Prerequisites

- **Foundry** - Ethereum development toolkit
- **Docker** - For running ChainGuard scanner
- **Git** - For dependency management

### Install Foundry

```shell
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Setup

### 1. Install Dependencies

```shell
cd contracts/examples
forge install OpenZeppelin/openzeppelin-contracts
```

### 2. Build Contracts

```shell
forge build
```

### 3. Run Tests (Optional)

```shell
forge test
```

## Scanning with ChainGuard

### Option 1: Using Docker (Recommended)

From the project root directory:

```shell
# Start the scanner service
docker-compose up scanner

# In another terminal, scan the contracts
curl -X POST http://localhost:8001/scan-directory \
  -F "directory=@contracts/examples"
```

### Option 2: Scan Individual Contracts

```shell
# Scan a specific contract
curl -X POST http://localhost:8001/scan-file \
  -F "file=@contracts/examples/src/VulnerableVault.sol"
```

### Option 3: Using the Scanner Directly

If you have the scanner tools installed locally:

```shell
# Slither
slither contracts/examples/src/

# Aderyn (requires Foundry project)
aderyn contracts/examples/

# Echidna (requires test properties)
echidna contracts/examples/src/VulnerableVault.sol
```

## Expected Scan Results

### VulnerableVault.sol
- **Critical**: Reentrancy vulnerability in `withdraw()` and `withdrawPartial()`
- **Critical**: Missing access control in `emergencyWithdraw()`
- **Critical**: Missing access control in `transferOwnership()`
- **Medium**: Unchecked return value in `emergencyWithdraw()`

### VulnerableToken.sol
- **High**: Unchecked transfer return values
- **Medium**: Missing events for critical operations
- **Low**: Centralization risks

### SecureVault.sol
- **Clean**: Should pass all security checks
- Demonstrates proper use of ReentrancyGuard and access control

## Learning Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [SWC Registry](https://swcregistry.io/) - Smart Contract Weakness Classification
