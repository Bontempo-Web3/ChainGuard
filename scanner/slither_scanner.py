import asyncio
import json
import subprocess
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class SlitherScanner:
    def __init__(self):
        self.timeout = 120
    
    async def scan(self, target_path: str) -> Dict:
        try:
            logger.info(f"Running Slither on {target_path}")
            
            cmd = [
                "slither",
                target_path,
                "--json", "-",
                "--exclude-dependencies",
                "--filter-paths", "node_modules|test"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                raise Exception("Slither scan timed out")
            
            if stdout:
                try:
                    results = json.loads(stdout.decode())
                    vulnerabilities = self._parse_results(results)
                    logger.info(f"Slither found {len(vulnerabilities)} issues")
                    return {"vulnerabilities": vulnerabilities}
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse Slither output: {e}")
                    return {"vulnerabilities": [], "error": "Failed to parse output"}
            
            return {"vulnerabilities": []}
            
        except Exception as e:
            logger.error(f"Slither scan failed: {str(e)}")
            raise
    
    def _parse_results(self, results: Dict) -> List[Dict]:
        vulnerabilities = []
        
        if not results.get("success"):
            return vulnerabilities
        
        for detector_result in results.get("results", {}).get("detectors", []):
            impact = detector_result.get("impact", "Low")
            confidence = detector_result.get("confidence", "Low")
            
            if impact.lower() in ["high", "medium", "low"] or confidence.lower() in ["high", "medium"]:
                
                location = ""
                if detector_result.get("elements"):
                    first_element = detector_result["elements"][0]
                    source_mapping = first_element.get("source_mapping", {})
                    if source_mapping:
                        filename = source_mapping.get("filename_short", "")
                        lines = source_mapping.get("lines", [])
                        if lines:
                            location = f"{filename}:{lines[0]}"
                
                vulnerabilities.append({
                    "check": detector_result.get("check", "unknown"),
                    "impact": impact,
                    "confidence": confidence,
                    "description": detector_result.get("description", ""),
                    "location": location,
                    "elements": detector_result.get("elements", [])
                })
        
        return vulnerabilities
