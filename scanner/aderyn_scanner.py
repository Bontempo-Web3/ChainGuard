import asyncio
import json
import os
import subprocess
from pathlib import Path
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class AderynScanner:
    """
    Scanner wrapper for Aderyn with robust error handling.
    
    ADERYN LIMITATIONS:
    1. Does not work with a single file - requires a full Foundry project
    2. Requires foundry.toml in the project root
    3. Expects a standard directory structure (src/, lib/, etc)
    
    SOLUTIONS:
    1. Detect whether target is a single file or a project
    2. If single file, skip and fall back to other tools
    3. Handle errors gracefully without breaking the overall scan
    """
    
    def __init__(self):
        self.command = "aderyn"
        
    async def scan(self, target_path: str) -> Dict:
        """
        Run Aderyn scan with robust error handling.
        
        Args:
            target_path: Path to .sol file or project directory
            
        Returns:
            Dict with scan results or handled error information
        """
        try:
            # Verifica se Aderyn está disponível
            if not self._is_aderyn_available():
                logger.warning("Aderyn not available, skipping scan")
                return {
                    "vulnerabilities": [],
                    "error": "Aderyn not installed",
                    "skipped": True
                }
            
            # Determina se é arquivo único ou projeto
            is_single_file = os.path.isfile(target_path) and target_path.endswith('.sol')
            
            if is_single_file:
                logger.warning(f"Aderyn does not support single file analysis: {target_path}")
                return {
                    "vulnerabilities": [],
                    "error": "Aderyn requires a Foundry project structure (not single file)",
                    "skipped": True,
                    "recommendation": "Use Slither for single file analysis"
                }
            
            # Verifica se é projeto Foundry válido
            if not self._is_foundry_project(target_path):
                logger.warning(f"Not a valid Foundry project: {target_path}")
                return {
                    "vulnerabilities": [],
                    "error": "Not a Foundry project (missing foundry.toml)",
                    "skipped": True,
                    "recommendation": "Aderyn requires foundry.toml in project root"
                }
            
            # Executa scan
            return await self._run_aderyn(target_path)
            
        except Exception as e:
            logger.error(f"Aderyn scan failed: {str(e)}")
            return {
                "vulnerabilities": [],
                "error": str(e),
                "skipped": True
            }
    
    def _is_aderyn_available(self) -> bool:
        """Check if Aderyn is installed and available on PATH."""
        try:
            result = subprocess.run(
                ["aderyn", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def _is_foundry_project(self, path: str) -> bool:
        """
        Check if a directory is a valid Foundry project.
        
        Criteria:
        - Has foundry.toml in the root
        - Has src/ or contracts/ directory
        """
        if not os.path.isdir(path):
            return False
        
        # Verifica foundry.toml
        foundry_toml = os.path.join(path, "foundry.toml")
        if not os.path.exists(foundry_toml):
            return False
        
        # Verifica se tem src/ ou contracts/
        src_dir = os.path.join(path, "src")
        contracts_dir = os.path.join(path, "contracts")
        
        return os.path.isdir(src_dir) or os.path.isdir(contracts_dir)
    
    async def _run_aderyn(self, project_path: str) -> Dict:
        """
        Run Aderyn on the project and parse the results.
        
        Args:
            project_path: Path to Foundry project root
            
        Returns:
            Dict with the vulnerabilities found
        """
        try:
            # Aderyn command
            cmd = [
                "aderyn",
                project_path,
                "--output", "json"  # Tenta output JSON se disponível
            ]
            
            logger.info(f"Running Aderyn on {project_path}")
            
            # Run with timeout
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project_path
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=300  # 5 minute timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                raise Exception("Aderyn scan timeout (5 minutes)")
            
            # Check if report.md was generated (Aderyn's default output)
            report_path = os.path.join(project_path, "report.md")
            
            if os.path.exists(report_path):
                return self._parse_markdown_report(report_path)
            else:
                # Try to parse stdout as JSON
                if stdout:
                    try:
                        return json.loads(stdout.decode())
                    except json.JSONDecodeError:
                        pass
                
                # If there is no report, return empty result with warning
                logger.warning("Aderyn completed but no report generated")
                return {
                    "vulnerabilities": [],
                    "warning": "Aderyn completed but no report found",
                    "stderr": stderr.decode() if stderr else ""
                }
                
        except Exception as e:
            logger.error(f"Error running Aderyn: {str(e)}")
            raise
    
    def _parse_markdown_report(self, report_path: str) -> Dict:
        """
        Parse Aderyn's report.md and extract vulnerabilities.
        
        Aderyn generates a Markdown report with sections:
        - Issue Summary (table with High/Low counts)
        - High Issues (H-1, H-2, etc)
        - Low Issues (L-1, L-2, etc)
        
        Args:
            report_path: Path to report.md
            
        Returns:
            Dict with parsed vulnerabilities
        """
        try:
            with open(report_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            vulnerabilities = []
            
            # Extrai contagem de issues da tabela Issue Summary
            summary = self._extract_summary(content)
            
            # Parseia High Issues
            high_issues = self._extract_issues(content, "High Issues", "high")
            vulnerabilities.extend(high_issues)
            
            # Parseia Low Issues
            low_issues = self._extract_issues(content, "Low Issues", "low")
            vulnerabilities.extend(low_issues)
            
            return {
                "vulnerabilities": vulnerabilities,
                "summary": summary,
                "report_path": report_path
            }
            
        except Exception as e:
            logger.error(f"Error parsing Aderyn report: {str(e)}")
            return {
                "vulnerabilities": [],
                "error": f"Failed to parse report: {str(e)}"
            }
    
    def _extract_summary(self, content: str) -> Dict:
        """Extract Issue Summary from the report content."""
        summary = {"high": 0, "low": 0, "total": 0}
        
        try:
            # Look for Issue Summary table
            if "| Category | No. of Issues |" in content:
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if "| High |" in line:
                        parts = line.split('|')
                        if len(parts) >= 3:
                            summary["high"] = int(parts[2].strip())
                    elif "| Low |" in line:
                        parts = line.split('|')
                        if len(parts) >= 3:
                            summary["low"] = int(parts[2].strip())
            
            summary["total"] = summary["high"] + summary["low"]
        except Exception as e:
            logger.warning(f"Could not extract summary: {str(e)}")
        
        return summary
    
    def _extract_issues(self, content: str, section_name: str, severity: str) -> List[Dict]:
        """
        Extract issues from a specific section (High Issues or Low Issues).
        
        Expected format:
        ## H-1: Title of vulnerability
        Description...
        <details><summary>X Found Instances</summary>
        - Found in file.sol [Line: X](file.sol#LX)
        </details>
        """
        issues = []
        
        try:
            # Split into sections
            sections = content.split('## ')
            
            for section in sections:
                # Check if this is an issue of the correct severity
                if severity == "high" and not section.startswith('H-'):
                    continue
                if severity == "low" and not section.startswith('L-'):
                    continue
                
                # Extract ID and title
                lines = section.split('\n')
                if not lines:
                    continue
                
                header = lines[0]
                parts = header.split(':', 1)
                if len(parts) < 2:
                    continue
                
                issue_id = parts[0].strip()
                title = parts[1].strip()
                
                # Extract description (first line after the header)
                description = ""
                if len(lines) > 1:
                    description = lines[1].strip()
                
                # Extract locations
                locations = []
                for line in lines:
                    if "Found in" in line and "[Line:" in line:
                        # Parse: - Found in src/File.sol [Line: 25](src/File.sol#L25)
                        try:
                            file_part = line.split("Found in")[1].split("[Line:")[0].strip()
                            line_part = line.split("[Line:")[1].split("]")[0].strip()
                            locations.append(f"{file_part}:{line_part}")
                        except:
                            pass
                
                issues.append({
                    "id": issue_id,
                    "title": title,
                    "description": description,
                    "severity": severity,
                    "locations": locations,
                    "instances": len(locations)
                })
        
        except Exception as e:
            logger.warning(f"Error extracting {section_name}: {str(e)}")
        
        return issues
