from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from typing import List, Dict, Optional
import logging

from scanner_orchestrator import ScannerOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ChainGuard Scanner Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = ScannerOrchestrator()

class ScanRequest(BaseModel):
    repository: str
    commit: str
    branch: Optional[str] = "main"

class ScanResponse(BaseModel):
    status: str
    vulnerabilities: List[Dict]
    summary: Dict
    scan_duration: float

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "scanner"}

@app.post("/scan", response_model=ScanResponse)
async def scan_contract(request: ScanRequest):
    try:
        logger.info(f"Starting scan for {request.repository}@{request.commit}")
        
        result = await orchestrator.scan(
            repository=request.repository,
            commit=request.commit,
            branch=request.branch
        )
        
        return result
    except Exception as e:
        logger.error(f"Scan failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "service": "ChainGuard Scanner",
        "version": "1.0.0",
        "tools": ["slither", "mythril"]
    }
