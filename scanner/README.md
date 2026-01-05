# ChainGuard Scanner Service

Security scanner service that orchestrates Slither and Mythril for smart contract analysis.

## Features

- **Slither Integration**: Fast static analysis
- **Mythril Integration**: Deep symbolic execution
- **Parallel Execution**: Runs both tools simultaneously
- **Result Aggregation**: Unified vulnerability format
- **Severity Classification**: Critical, High, Medium, Low

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

- `TIMEOUT_SLITHER`: Slither timeout in seconds (default: 120)
- `TIMEOUT_MYTHRIL`: Mythril timeout in seconds (default: 180)
- `MAX_DEPTH`: Mythril max depth (default: 12)
