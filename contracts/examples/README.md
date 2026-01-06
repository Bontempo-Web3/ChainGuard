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

## Usage

### Build

```shell
forge build
```

### Test

```shell
forge test
```

### Scan with ChainGuard

```shell
# From project root
docker-compose up scanner

# Scan these contracts
curl -X POST http://localhost:8001/scan-directory \
  -F "directory=@contracts/examples"
```

## Foundry Documentation

https://book.getfoundry.sh/
