# ChainGuard Security Scan Action

Automated security scanning for Solidity smart contracts using Slither, Aderyn, Echidna, and optional Claude AI.

## Features

- **Multi-Tool Analysis**: Combines Slither (static analysis), Aderyn (Rust-based analysis), and Echidna (fuzzing)
- **AI-Powered Audit**: Optional Claude Mini-Audit for deeper analysis
- **Configurable Severity**: Set minimum severity threshold
- **Flexible Tools**: Run Slither, Aderyn, or both
- **Fuzzing Tests**: Echidna property-based testing
- **PR Comments**: Automatic vulnerability reporting (coming soon)
- **Fast**: Optimized for CI/CD workflows
- **Zero Config**: Works out of the box

## Usage

### Basic Usage

Add this to your `.github/workflows/security.yml`:

```yaml
name: Security Scan

on:
  pull_request:
    paths:
      - '**.sol'
  push:
    branches:
      - main

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run ChainGuard Security Scan
        uses: Bontempo-Web3/ChainGuard@v1
```

### Advanced Configuration

```yaml
- name: Run ChainGuard Security Scan
  uses: Bontempo-Web3/ChainGuard@v1
  with:
    # Minimum severity to fail the check
    # Options: critical, high, medium, low
    severity: 'high'
    
    # Tools to run
    # Options: slither, aderyn, both
    tools: 'both'
    
    # Enable Claude Mini-Audit (optional, requires API key)
    claude-audit: 'false'
    
    # Anthropic API key for Claude (optional)
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    
    # Fail the action if vulnerabilities are found
    fail-on-detection: 'true'
    
    # Solidity compiler version
    solidity-version: '0.8.20'
    
    # Target directory or file
    target: './contracts'
```

### With Claude Mini-Audit

For deeper AI-powered analysis, enable Claude:

```yaml
- name: Run ChainGuard with Claude
  uses: Bontempo-Web3/ChainGuard@v1
  with:
    tools: 'both'
    claude-audit: 'true'
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Note**: Claude Mini-Audit requires an Anthropic API key. Add it to your repository secrets at Settings > Secrets > Actions.

### Use Scan Results

```yaml
- name: Run ChainGuard Security Scan
  id: scan
  uses: Bontempo-Web3/ChainGuard@v1
  continue-on-error: true

- name: Check Results
  run: |
    echo "Critical: ${{ steps.scan.outputs.critical-count }}"
    echo "High: ${{ steps.scan.outputs.high-count }}"
    echo "Medium: ${{ steps.scan.outputs.medium-count }}"
    echo "Low: ${{ steps.scan.outputs.low-count }}"
    echo "Total: ${{ steps.scan.outputs.total-count }}"
    echo "Result: ${{ steps.scan.outputs.scan-result }}"
```

### Only Scan Changed Files

```yaml
- name: Get Changed Files
  id: changed-files
  uses: tj-actions/changed-files@v40
  with:
    files: |
      **.sol

- name: Run ChainGuard on Changed Files
  if: steps.changed-files.outputs.any_changed == 'true'
  uses: Bontempo-Web3/ChainGuard@v1
  with:
    target: ${{ steps.changed-files.outputs.all_changed_files }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `severity` | Minimum severity to fail (`critical`, `high`, `medium`, `low`) | No | `high` |
| `tools` | Tools to run (`slither`, `aderyn`, `both`) | No | `both` |
| `fail-on-detection` | Fail if vulnerabilities found | No | `true` |
| `solidity-version` | Solidity compiler version | No | `0.8.20` |
| `target` | Target directory or file to scan | No | `.` |
| `github-token` | GitHub token for API access | No | `${{ github.token }}` |

## Outputs

| Output | Description |
|--------|-------------|
| `critical-count` | Number of critical vulnerabilities |
| `high-count` | Number of high severity vulnerabilities |
| `medium-count` | Number of medium severity vulnerabilities |
| `low-count` | Number of low severity vulnerabilities |
| `total-count` | Total vulnerabilities found |
| `scan-result` | Overall result (`passed` or `failed`) |

## Severity Levels

### Critical
- Reentrancy attacks
- Integer overflow/underflow
- Unchecked external calls
- Access control issues

### High
- Delegatecall to untrusted contract
- Unprotected selfdestruct
- Timestamp dependence
- Gas limit issues

### Medium
- Deprecated functions
- Floating pragma
- Missing events
- Code optimization

### Low
- Naming conventions
- Code style
- Gas optimizations
- Best practices

## Examples

### Block PRs with Critical Issues

```yaml
name: Security Gate

on:
  pull_request:

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Security Scan
        uses: Bontempo-Web3/ChainGuard@v1
        with:
          severity: 'critical'
          fail-on-detection: 'true'
```

### Scan Only with Slither (Faster)

```yaml
- name: Quick Scan
  uses: Bontempo-Web3/ChainGuard@v1
  with:
    tools: 'slither'
    severity: 'high'
```

### Warning Only (Don't Fail)

```yaml
- name: Security Audit
  uses: Bontempo-Web3/ChainGuard@v1
  with:
    fail-on-detection: 'false'
  continue-on-error: true
```

### Multi-Version Testing

```yaml
strategy:
  matrix:
    solidity: ['0.8.19', '0.8.20', '0.8.21']

steps:
  - uses: actions/checkout@v4
  
  - name: Scan with Solidity ${{ matrix.solidity }}
    uses: Bontempo-Web3/ChainGuard@v1
    with:
      solidity-version: ${{ matrix.solidity }}
```

## Detected Vulnerabilities

ChainGuard detects:

- Reentrancy (SWC-107)
- Integer Overflow/Underflow (SWC-101)
- Unchecked Call Return Values (SWC-104)
- Access Control (SWC-105)
- Delegatecall (SWC-112)
- Timestamp Dependence (SWC-116)
- Unprotected Ether Withdrawal (SWC-105)
- Denial of Service (SWC-113)
- Bad Randomness (SWC-120)
- Front-Running (SWC-114)
- And many more...

## Performance

| Tool | Average Time | Timeout |
|------|--------------|---------|
| Slither | 10-30 seconds | 5 minutes |
| Aderyn | 20-40 seconds | 5 minutes |
| Both | 30-60 seconds | 10 minutes |
| With Claude | 1-2 minutes | 10 minutes |

## Troubleshooting

### Action Fails with "No .sol files found"

Make sure your Solidity files are in the repository and the `target` path is correct.

### Timeout Errors

Large contracts may timeout. Try:
- Use only Slither: `tools: 'slither'`
- Scan specific files: `target: './contracts/MyContract.sol'`

### Compiler Version Issues

Specify the exact Solidity version used in your contracts:

```yaml
with:
  solidity-version: '0.8.19'
```

## Contributing

Contributions welcome! Please read our [Contributing Guide](../CONTRIBUTING.md).

## License

MIT License - see [LICENSE](../LICENSE) for details.

## Support

- Email: mariliabontempo@gmail.com
- Issues: [GitHub Issues](https://github.com/Bontempo-Web3/ChainGuard/issues)
- Discussions: [GitHub Discussions](https://github.com/Bontempo-Web3/ChainGuard/discussions)

## Related

- [ChainGuard Repository](https://github.com/Bontempo-Web3/ChainGuard) - Full scanner service
- [Slither](https://github.com/crytic/slither) - Static analysis framework
- [Aderyn](https://github.com/Cyfrin/aderyn) - Rust-based security analysis tool
- [Echidna](https://github.com/crytic/echidna) - Property-based fuzzing tool
- [Anthropic Claude](https://www.anthropic.com/claude) - AI-powered code analysis

---

**Built for the Web3 community**
