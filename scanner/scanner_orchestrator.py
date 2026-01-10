import asyncio
import json
import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Dict, List
import logging

from slither_scanner import SlitherScanner
from aderyn_scanner import AderynScanner
from echidna_scanner import EchidnaScanner
from claude_scanner import ClaudeScanner
from git_handler import GitHandler

logger = logging.getLogger(__name__)

class ScannerOrchestrator:
    def __init__(self):
        self.slither = SlitherScanner()
        self.aderyn = AderynScanner()
        self.echidna = EchidnaScanner()
        self.claude = ClaudeScanner()
        self.git_handler = GitHandler()
        
    async def scan(self, repository: str, commit: str, branch: str = "main") -> Dict:
        start_time = time.time()
        temp_dir = None
        
        try:
            temp_dir = tempfile.mkdtemp(prefix="chainguard_")
            logger.info(f"Created temp directory: {temp_dir}")
            
            await self.git_handler.clone_repository(repository, temp_dir, commit)
            
            result = await self._scan_path(temp_dir, start_time)
            
            return result
            
        except Exception as e:
            logger.error(f"Scan orchestration failed: {str(e)}")
            raise
        finally:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
                logger.info(f"Cleaned up temp directory: {temp_dir}")
    
    async def scan_directory(self, directory: str) -> Dict:
        """Scan a local directory without cloning from Git"""
        start_time = time.time()
        
        try:
            logger.info(f"Scanning local directory: {directory}")
            
            result = await self._scan_path(directory, start_time)
            
            return result
            
        except Exception as e:
            logger.error(f"Directory scan failed: {str(e)}")
            raise
    
    async def _scan_path(self, path: str, start_time: float) -> Dict:
        """Internal method to scan a given path (repository or directory)"""
        sol_files = self._find_solidity_files(path)
        if not sol_files:
            raise Exception("No Solidity files found in directory")
        
        logger.info(f"Found {len(sol_files)} Solidity files")
        logger.info("Starting parallel security scans...")
        
        logger.info("→ Running Slither static analysis...")
        slither_task = asyncio.create_task(self.slither.scan(path))
        
        logger.info("→ Running Aderyn Rust-based analysis...")
        aderyn_task = asyncio.create_task(self.aderyn.scan(path))
        
        logger.info("→ Running Echidna fuzzing tests...")
        echidna_task = asyncio.create_task(self.echidna.scan(path, test_limit=10000))
        
        slither_results, aderyn_results, echidna_results = await asyncio.gather(
            slither_task,
            aderyn_task,
            echidna_task,
            return_exceptions=True
        )
        
        logger.info("✓ Slither scan completed")
        logger.info("✓ Aderyn scan completed")
        logger.info("✓ Echidna scan completed")
        
        if isinstance(slither_results, Exception):
            logger.error(f"Slither scan failed: {slither_results}")
            slither_results = {"vulnerabilities": [], "error": str(slither_results)}
        
        if isinstance(aderyn_results, Exception):
            logger.error(f"Aderyn scan failed: {aderyn_results}")
            aderyn_results = {"vulnerabilities": [], "error": str(aderyn_results)}
        
        if isinstance(echidna_results, Exception):
            logger.error(f"Echidna scan failed: {echidna_results}")
            echidna_results = {"vulnerabilities": [], "error": str(echidna_results)}
        
        # Claude Mini-Audit (runs after other tools)
        # Receives results from Slither, Aderyn and Echidna as input
        logger.info("→ Running Claude AI-powered mini-audit...")
        claude_results = {"vulnerabilities": [], "skipped": True}
        
        # Get first contract for Claude analysis
        if sol_files:
            main_contract = sol_files[0]
            try:
                with open(main_contract, 'r', encoding='utf-8') as f:
                    contract_code = f.read()
                
                contract_name = os.path.basename(main_contract).replace('.sol', '')
                logger.info(f"  Analyzing {contract_name} with Claude...")
                
                claude_results = await self.claude.scan(
                    contract_code,
                    contract_name,
                    slither_results,
                    aderyn_results,
                    echidna_results
                )
                logger.info("✓ Claude mini-audit completed")
            except Exception as e:
                logger.error(f"Claude scan failed: {str(e)}")
                claude_results = {"vulnerabilities": [], "error": str(e)}
        
        logger.info("Aggregating results from all scanners...")
        vulnerabilities = self._aggregate_results(slither_results, aderyn_results, echidna_results, claude_results)
        
        scan_duration = time.time() - start_time
        
        summary = self._generate_summary(vulnerabilities)
        
        logger.info(f"Scan completed in {scan_duration:.2f}s - Found {summary['total']} vulnerabilities")
        logger.info(f"  Critical: {summary['critical']}, High: {summary['high']}, Medium: {summary['medium']}, Low: {summary['low']}")
        
        return {
            "status": "completed",
            "vulnerabilities": vulnerabilities,
            "summary": summary,
            "scan_duration": scan_duration
        }
    
    def _find_solidity_files(self, directory: str) -> List[str]:
        sol_files = []
        for root, dirs, files in os.walk(directory):
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'test', 'tests']]
            
            for file in files:
                if file.endswith('.sol'):
                    sol_files.append(os.path.join(root, file))
        return sol_files
    
    def _aggregate_results(self, slither_results: Dict, aderyn_results: Dict, echidna_results: Dict, claude_results: Dict) -> List[Dict]:
        vulnerabilities = []
        
        for vuln in slither_results.get("vulnerabilities", []):
            vulnerabilities.append({
                "source": "slither",
                "type": vuln.get("check", "unknown"),
                "title": vuln.get("check", "Unknown Issue"),
                "severity": self._normalize_severity(vuln.get("impact", "low")),
                "description": vuln.get("description", ""),
                "location": vuln.get("location", ""),
                "confidence": vuln.get("confidence", ""),
                "raw": vuln
            })
        
        for vuln in aderyn_results.get("vulnerabilities", []):
            vulnerabilities.append({
                "source": "aderyn",
                "type": vuln.get("id", "unknown"),
                "title": vuln.get("title", "Unknown Issue"),
                "severity": self._normalize_severity(vuln.get("severity", "low")),
                "description": vuln.get("description", ""),
                "location": ", ".join(vuln.get("locations", [])),
                "instances": vuln.get("instances", 0),
                "raw": vuln
            })
        
        for vuln in echidna_results.get("vulnerabilities", []):
            vulnerabilities.append({
                "source": "echidna",
                "type": vuln.get("type", "unknown"),
                "title": vuln.get("title", "Unknown Issue"),
                "severity": self._normalize_severity(vuln.get("severity", "high")),
                "description": vuln.get("description", ""),
                "location": vuln.get("function", ""),
                "details": vuln.get("details", ""),
                "raw": vuln
            })
        
        for vuln in claude_results.get("vulnerabilities", []):
            vulnerabilities.append({
                "source": "claude",
                "type": vuln.get("type", "ai_analysis"),
                "title": vuln.get("title", "Unknown Issue"),
                "severity": self._normalize_severity(vuln.get("severity", "medium")),
                "description": vuln.get("description", ""),
                "impact": vuln.get("impact", ""),
                "likelihood": vuln.get("likelihood", "medium"),
                "recommendation": vuln.get("recommendation", ""),
                "priority": vuln.get("priority", 999),
                "raw": vuln
            })
        
        vulnerabilities.sort(key=lambda x: self._severity_weight(x["severity"]), reverse=True)
        
        return vulnerabilities
    
    def _normalize_severity(self, severity: str) -> str:
        severity_lower = severity.lower()
        
        mapping = {
            "critical": "critical",
            "high": "high",
            "medium": "medium",
            "low": "low",
            "informational": "low",
            "optimization": "low",
            "info": "low"
        }
        
        return mapping.get(severity_lower, "low")
    
    def _severity_weight(self, severity: str) -> int:
        weights = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        }
        return weights.get(severity.lower(), 0)
    
    def _generate_summary(self, vulnerabilities: List[Dict]) -> Dict:
        summary = {
            "total": len(vulnerabilities),
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "by_source": {
                "slither": 0,
                "aderyn": 0,
                "echidna": 0,
                "claude": 0
            }
        }
        
        for vuln in vulnerabilities:
            severity = vuln["severity"].lower()
            if severity in summary:
                summary[severity] += 1
            
            source = vuln.get("source", "unknown")
            if source in summary["by_source"]:
                summary["by_source"][source] += 1
        
        return summary
