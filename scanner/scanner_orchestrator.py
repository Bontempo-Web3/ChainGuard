import asyncio
import json
import os
import re
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
        
        # Business Rules Inference
        logger.info("→ Inferring business rules from contract...")
        business_rules = {"rules": [], "error": "No contract analyzed"}
        
        if sol_files:
            main_contract = sol_files[0]
            try:
                with open(main_contract, 'r', encoding='utf-8') as f:
                    contract_code = f.read()
                
                contract_name = os.path.basename(main_contract).replace('.sol', '')
                business_rules = await self.claude.infer_business_rules(contract_code, contract_name)
                logger.info(f"✓ Inferred {len(business_rules.get('rules', []))} business rules")
            except Exception as e:
                logger.error(f"Business rules inference failed: {str(e)}")
                business_rules = {"rules": [], "error": str(e)}
        
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
            "business_rules": business_rules,
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
    
    async def generate_tests_from_rules(
        self,
        repository: str,
        commit: str,
        branch: str,
        selected_rules: List[Dict]
    ) -> Dict:
        """Generate Foundry tests from selected business rules.
        
        Args:
            repository: Git repository URL
            commit: Commit hash or branch name
            branch: Branch name
            selected_rules: List of confirmed business rules
            
        Returns:
            Dict with generated test code and execution results
        """
        temp_dir = None
        try:
            temp_dir = tempfile.mkdtemp(prefix="chainguard_tests_")
            logger.info(f"Created temp directory for tests: {temp_dir}")
            
            # Clone repository
            await self.git_handler.clone_repository(repository, temp_dir, branch)
            
            # Find main contract
            sol_files = self._find_solidity_files(temp_dir)
            if not sol_files:
                return {"status": "error", "error": "No Solidity files found"}
            
            main_contract = sol_files[0]
            with open(main_contract, 'r', encoding='utf-8') as f:
                contract_code = f.read()
            
            contract_name = os.path.basename(main_contract).replace('.sol', '')
            
            # Generate tests using Claude
            logger.info(f"Generating tests for {len(selected_rules)} rules...")
            result = await self.claude.generate_tests_from_rules(
                contract_code,
                contract_name,
                selected_rules
            )
            
            if result.get("status") == "error":
                return result
            
            # Save generated test file
            test_dir = os.path.join(temp_dir, "test", "generated")
            os.makedirs(test_dir, exist_ok=True)
            test_file = os.path.join(test_dir, f"{contract_name}BusinessTest.t.sol")
            
            with open(test_file, 'w', encoding='utf-8') as f:
                f.write(result["test_code"])
            
            logger.info(f"Saved test file: {test_file}")
            
            # Create ISOLATED test environment (separate from cloned repo)
            # This prevents Forge from compiling broken dependencies in the original project
            isolated_test_dir = tempfile.mkdtemp(prefix="chainguard_isolated_test_")
            logger.info(f"Created isolated test environment: {isolated_test_dir}")
            
            try:
                import subprocess
                
                # Initialize a fresh Foundry project
                logger.info("Initializing fresh Foundry project...")
                init_result = subprocess.run(
                    ["forge", "init", "--no-git"],
                    cwd=isolated_test_dir,
                    capture_output=True,
                    timeout=60
                )
                
                if init_result.returncode != 0:
                    logger.warning(f"Forge init warning: {init_result.stderr.decode()[:200]}")
                
                # Copy generated test file to isolated environment
                isolated_test_file = os.path.join(isolated_test_dir, "test", f"{contract_name}BusinessTest.t.sol")
                os.makedirs(os.path.dirname(isolated_test_file), exist_ok=True)
                
                with open(isolated_test_file, 'w', encoding='utf-8') as f:
                    f.write(result["test_code"])
                
                logger.info(f"Copied test to isolated environment: {isolated_test_file}")
                
                # Remove default Counter files that forge init creates
                default_files = [
                    os.path.join(isolated_test_dir, "src", "Counter.sol"),
                    os.path.join(isolated_test_dir, "test", "Counter.t.sol"),
                    os.path.join(isolated_test_dir, "script", "Counter.s.sol"),
                ]
                for f in default_files:
                    if os.path.exists(f):
                        os.remove(f)
                
                # Run forge test in isolated environment
                test_results = await self._run_forge_tests(isolated_test_dir, isolated_test_file)
                
                final_test_code = result["test_code"]
                fix_attempted = False
                
                # ALWAYS run fixer to clean up any issues (depth errors, etc)
                logger.info(f"Running test fixer (passed={test_results.get('passed', 0)}, failed={test_results.get('failed', 0)})...")
                
                fix_result = await self.claude.fix_failing_tests(
                    test_code=result["test_code"],
                    test_output=test_results.get("output", ""),
                    contract_name=contract_name
                )
                
                if fix_result.get("status") == "success":
                    fix_attempted = True
                    final_test_code = fix_result["test_code"]
                    
                    # Write fixed test file
                    with open(isolated_test_file, 'w', encoding='utf-8') as f:
                        f.write(final_test_code)
                    
                    logger.info("Fixed test file written, re-running tests...")
                    
                    # Re-run tests with fixed code
                    test_results = await self._run_forge_tests(isolated_test_dir, isolated_test_file)
                    test_results["fix_attempted"] = True
                
            finally:
                # Cleanup isolated test directory
                try:
                    shutil.rmtree(isolated_test_dir)
                    logger.info(f"Cleaned up isolated test directory: {isolated_test_dir}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup isolated test directory: {e}")
            
            return {
                "status": "success",
                "contract_name": contract_name,
                "test_code": final_test_code,
                "rules_tested": len(selected_rules),
                "test_results": test_results,
                "tokens_used": result.get("tokens_used", {})
            }
            
        except Exception as e:
            logger.error(f"Test generation failed: {str(e)}")
            return {"status": "error", "error": str(e)}
        finally:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
                logger.info(f"Cleaned up temp directory: {temp_dir}")
    
    async def _run_forge_tests(self, project_path: str, test_file: str) -> Dict:
        """Run forge test on generated test file."""
        try:
            import subprocess
            
            result = subprocess.run(
                ["forge", "test", "--match-path", test_file, "-vv"],
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            output = result.stdout + result.stderr
            
            # Parse results - count [PASS] and [FAIL: or [FAIL]
            passed = len(re.findall(r'\[PASS\]', output))
            failed = len(re.findall(r'\[FAIL[:\]]', output))
            
            return {
                "passed": passed,
                "failed": failed,
                "total": passed + failed,
                "output": output[:3000],
                "success": failed == 0 and passed > 0
            }
            
        except subprocess.TimeoutExpired:
            return {"passed": 0, "failed": 0, "total": 0, "output": "Test execution timed out", "success": False}
        except Exception as e:
            return {"passed": 0, "failed": 0, "total": 0, "output": str(e), "success": False}
