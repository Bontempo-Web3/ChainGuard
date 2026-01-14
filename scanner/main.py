from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from typing import List, Dict, Optional
import logging
import tempfile
import shutil
import os
from pathlib import Path

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
    business_rules: Optional[Dict] = None
    scan_duration: float

class GenerateTestsRequest(BaseModel):
    repository: str
    commit: str
    branch: Optional[str] = "main"
    selected_rules: List[Dict]
    contract_code: Optional[str] = None

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

@app.post("/scan-file")
async def scan_file(file: UploadFile = File(...)):
    """Scan a single Solidity file"""
    try:
        logger.info(f"Scanning file: {file.filename}")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, file.filename)
            
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            result = await orchestrator.scan_directory(temp_dir)
            
        return result
    except Exception as e:
        logger.error(f"File scan failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan-directory")
async def scan_directory(directory: str = Form(...)):
    """Scan all Solidity files in a directory"""
    try:
        logger.info(f"Scanning directory: {directory}")
        
        if not os.path.exists(directory):
            raise HTTPException(status_code=404, detail=f"Directory not found: {directory}")
        
        if not os.path.isdir(directory):
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {directory}")
        
        result = await orchestrator.scan_directory(directory)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Directory scan failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-tests")
async def generate_tests(request: GenerateTestsRequest):
    """Generate Foundry tests from selected business rules"""
    try:
        logger.info(f"Generating tests for {len(request.selected_rules)} rules")
        
        result = await orchestrator.generate_tests_from_rules(
            repository=request.repository,
            commit=request.commit,
            branch=request.branch,
            selected_rules=request.selected_rules
        )
        
        return result
    except Exception as e:
        logger.error(f"Test generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "service": "ChainGuard Scanner",
        "version": "1.0.0",
        "tools": ["slither", "aderyn", "echidna", "claude"],
        "endpoints": {
            "POST /scan": "Scan a Git repository",
            "POST /scan-file": "Scan a single Solidity file",
            "POST /scan-directory": "Scan all contracts in a directory",
            "POST /generate-tests": "Generate tests from selected business rules",
            "GET /health": "Health check"
        }
    }
