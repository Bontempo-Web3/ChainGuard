# ChainGuard Scanner Service

Security scanner service that orchestrates multiple tools for comprehensive smart contract analysis.

## Features

- **Slither Integration**: Fast static analysis with 165+ detectors
- **Aderyn Integration**: Modern Rust-based analysis with 17 critical detectors
- **Echidna Integration**: Automated property-based fuzzing with 10k+ test cases
- **Claude Mini-Audit**: AI-powered 10-step professional audit
- **Parallel Execution**: Runs tools efficiently
- **Result Aggregation**: Unified vulnerability format
- **Severity Classification**: Critical, High, Medium, Low
- **Intelligent Caching**: Redis-based caching for 30% cost savings

## API Endpoints

### POST /scan

Scan a smart contract repository.

**Request:**
```json
{
  "repository": "owner/repo",
  "commit": "abc123",
  "branch": "main"
}
```

**Response:**
```json
{
  "status": "completed",
  "vulnerabilities": [...],
  "summary": {
    "total": 5,
    "critical": 1,
    "high": 2,
    "medium": 1,
    "low": 1
  },
  "scan_duration": 45.2
}
```

### GET /health

Health check endpoint.

## Running Locally

```bash
cd scanner
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

## Docker

```bash
docker build -t chainguard-scanner .
docker run -p 8000:8000 chainguard-scanner
```

## Configuration

- `ANTHROPIC_API_KEY`: API key for Claude Mini-Audit (optional)
- `REDIS_URL`: Redis connection URL for caching (default: redis://redis:6379)
- `CACHE_DIR`: Directory for scanner cache (default: /app/.cache)
- `TIMEOUT_SLITHER`: Slither timeout in seconds (default: 120)
- `TIMEOUT_ADERYN`: Aderyn timeout in seconds (default: 300)
- `TIMEOUT_ECHIDNA`: Echidna timeout in seconds (default: 600)
