import asyncio
import json
import os
import subprocess
from pathlib import Path
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class EchidnaScanner:
    """
    Scanner wrapper for Echidna (automated fuzzing).
    
    ECHIDNA FEATURES:
    1. Automated fuzzing (no manual tests required)
    2. Detects edge cases that static analysis misses
    3. Tests invariants (echidna_* functions)
    4. Requires a Foundry project or Solidity project structure
    
    CONFIGURATION:
    - Uses echidna.yaml if available
    - Otherwise, uses default configuration
    - Configurable test limit (10k default, 100k+ for deep scan)
    """
    
    def __init__(self):
        self.command = "echidna"
        
    async def scan(self, target_path: str, test_limit: int = 10000) -> Dict:
        """
        Run fuzzing with Echidna.
        
        Args:
            target_path: Path to .sol file or project directory
            test_limit: Number of tests to run (10k = quick, 100k = standard, 1M = deep)
            
        Returns:
            Dict with fuzzing results
        """
        try:
            # Check if Echidna is available
            if not self._is_echidna_available():
                logger.warning("Echidna not available, skipping fuzzing")
                return {
                    "vulnerabilities": [],
                    "error": "Echidna not installed",
                    "skipped": True
                }
            
            # Check if it's a single file or project
            is_single_file = os.path.isfile(target_path) and target_path.endswith('.sol')
            
            if is_single_file:
                # Echidna can work with single file
                return await self._run_echidna_file(target_path, test_limit)
            else:
                # Full project
                return await self._run_echidna_project(target_path, test_limit)
            
        except Exception as e:
            logger.error(f"Echidna scan failed: {str(e)}")
            return {
                "vulnerabilities": [],
                "error": str(e),
                "skipped": True
            }
    
    def _is_echidna_available(self) -> bool:
        """Check if Echidna is installed."""
        try:
            result = subprocess.run(
                ["echidna", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    async def _run_echidna_file(self, file_path: str, test_limit: int) -> Dict:
        """
        Run Echidna on a single Solidity file.
        
        Args:
            file_path: Path to .sol file
            test_limit: Number of tests
            
        Returns:
            Dict with results
        """
        try:
            # Extract contract name from file
            contract_name = self._extract_contract_name(file_path)
            
            if not contract_name:
                return {
                    "vulnerabilities": [],
                    "error": "Could not extract contract name",
                    "skipped": True
                }
            
            cmd = [
                "echidna",
                file_path,
                "--contract", contract_name,
                "--test-mode", "assertion",
                "--test-limit", str(test_limit),
                "--format", "text"
            ]
            
            return await self._execute_echidna(cmd, os.path.dirname(file_path))
            
        except Exception as e:
            logger.error(f"Error running Echidna on file: {str(e)}")
            raise
    
    async def _run_echidna_project(self, project_path: str, test_limit: int) -> Dict:
        """
        Run Echidna on a full project.
        
        Args:
            project_path: Path to project root
            test_limit: Number of tests
            
        Returns:
            Dict with aggregated results from all contracts
        """
        try:
            # Find contracts in the project
            contracts = self._find_contracts(project_path)
            
            if not contracts:
                logger.warning("No contracts found for Echidna fuzzing")
                return {
                    "vulnerabilities": [],
                    "warning": "No contracts found",
                    "skipped": True
                }
            
            # Limit to 5 contracts to avoid long runs
            # (in production, this would be configurable)
            contracts_to_test = contracts[:5]
            
            if len(contracts) > 5:
                logger.info(f"Testing first 5 of {len(contracts)} contracts")
            
            all_vulnerabilities = []
            
            # Test each contract
            for contract_file, contract_name in contracts_to_test:
                try:
                    result = await self._run_echidna_on_contract(
                        project_path,
                        contract_file,
                        contract_name,
                        test_limit
                    )
                    
                    if result.get("vulnerabilities"):
                        all_vulnerabilities.extend(result["vulnerabilities"])
                        
                except Exception as e:
                    logger.warning(f"Failed to test {contract_name}: {str(e)}")
                    continue
            
            return {
                "vulnerabilities": all_vulnerabilities,
                "contracts_tested": len(contracts_to_test),
                "total_contracts": len(contracts)
            }
            
        except Exception as e:
            logger.error(f"Error running Echidna on project: {str(e)}")
            raise
    
    async def _run_echidna_on_contract(
        self, 
        project_path: str, 
        contract_file: str, 
        contract_name: str,
        test_limit: int
    ) -> Dict:
        """Run Echidna on a specific contract in a project."""
        
        # Check if echidna.yaml exists
        config_file = os.path.join(project_path, "echidna.yaml")
        
        cmd = [
            "echidna",
            ".",
            "--contract", contract_name,
            "--test-mode", "assertion",
            "--test-limit", str(test_limit),
            "--format", "text"
        ]
        
        # Use config if it exists
        if os.path.exists(config_file):
            cmd.extend(["--config", config_file])
        
        return await self._execute_echidna(cmd, project_path)
    
    async def _execute_echidna(self, cmd: List[str], cwd: str) -> Dict:
        """
        Execute Echidna command and parse its output.
        
        Args:
            cmd: Command to execute
            cwd: Working directory
            
        Returns:
            Dict with discovered vulnerabilities
        """
        try:
            logger.info(f"Running Echidna: {' '.join(cmd)}")
            
            # Run with timeout (2 minutes for quick scan)
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=120  # 2 minutos timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                raise Exception("Echidna fuzzing timeout (2 minutes)")
            
            output = stdout.decode() if stdout else ""
            errors = stderr.decode() if stderr else ""
            
            # Parseia resultados
            return self._parse_echidna_output(output, errors)
            
        except Exception as e:
            logger.error(f"Error executing Echidna: {str(e)}")
            raise
    
    def _parse_echidna_output(self, output: str, errors: str) -> Dict:
        """
        Parse Echidna output and extract vulnerabilities.
        
        Expected output lines:
        functionName(args): passing
        functionName(args): failed!
        
        Args:
            output: Echidna stdout
            errors: Echidna stderr
            
        Returns:
            Dict with vulnerabilities
        """
        vulnerabilities = []
        stats = {
            "tests_run": 0,
            "passed": 0,
            "failed": 0,
            "coverage": 0
        }
        
        try:
            lines = output.split('\n')
            
            for line in lines:
                # Extract statistics
                if "tests:" in line:
                    # Format: tests: 0/12, fuzzing: 10165/10000
                    parts = line.split(',')
                    if len(parts) >= 2:
                        fuzzing_part = parts[1].strip()
                        if "fuzzing:" in fuzzing_part:
                            tests = fuzzing_part.split(':')[1].strip().split('/')[0]
                            stats["tests_run"] = int(tests)
                
                if "cov:" in line:
                    # Format: cov: 2465
                    cov_part = line.split("cov:")[1].strip().split(',')[0]
                    stats["coverage"] = int(cov_part)
                
                # Detect failing tests (these are vulnerabilities)
                if ": failed!" in line or ": FAILED!" in line:
                    function_name = line.split(':')[0].strip()
                    
                    vulnerabilities.append({
                        "type": "assertion_failure",
                        "title": f"Assertion failed in {function_name}",
                        "description": f"Echidna found inputs that break the assertion in {function_name}",
                        "severity": "high",
                        "function": function_name,
                        "details": line.strip()
                    })
                    stats["failed"] += 1
                
                elif ": passing" in line or ": PASSED" in line:
                    stats["passed"] += 1
            
            # If no vulnerabilities were found but there were errors
            if not vulnerabilities and errors and "Error" in errors:
                logger.warning(f"Echidna errors: {errors}")
            
            return {
                "vulnerabilities": vulnerabilities,
                "stats": stats,
                "raw_output": output[:1000] if output else ""  # First 1000 chars
            }
            
        except Exception as e:
            logger.warning(f"Error parsing Echidna output: {str(e)}")
            return {
                "vulnerabilities": [],
                "error": f"Failed to parse output: {str(e)}",
                "raw_output": output[:500] if output else ""
            }
    
    def _extract_contract_name(self, file_path: str) -> str:
        """
        Extract main contract name from a .sol file.
        
        Args:
            file_path: Path to .sol file
            
        Returns:
            Contract name or empty string
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Look for "contract ContractName"
            import re
            matches = re.findall(r'contract\s+(\w+)', content)
            
            if matches:
                # Return the first non-abstract contract
                for match in matches:
                    if not re.search(rf'abstract\s+contract\s+{match}', content):
                        return match
                
                # If all are abstract, return the first one
                return matches[0]
            
            return ""
            
        except Exception as e:
            logger.warning(f"Could not extract contract name: {str(e)}")
            return ""
    
    def _find_contracts(self, project_path: str) -> List[tuple]:
        """
        Find contracts in the project to test.
        
        Args:
            project_path: Path to project root
            
        Returns:
            List of tuples (file_path, contract_name)
        """
        contracts = []
        
        # Search in src/ and contracts/
        search_dirs = [
            os.path.join(project_path, "src"),
            os.path.join(project_path, "contracts")
        ]
        
        for search_dir in search_dirs:
            if not os.path.exists(search_dir):
                continue
            
            for root, dirs, files in os.walk(search_dir):
                # Ignore test/ and lib/
                dirs[:] = [d for d in dirs if d not in ['test', 'tests', 'lib']]
                
                for file in files:
                    if file.endswith('.sol'):
                        file_path = os.path.join(root, file)
                        contract_name = self._extract_contract_name(file_path)
                        
                        if contract_name:
                            contracts.append((file_path, contract_name))
        
        return contracts
