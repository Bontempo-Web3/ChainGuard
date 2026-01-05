import asyncio
import json
import os
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class ClaudeScanner:
    """
    Scanner wrapper for Claude Mini-Audit.
    
    Integrates AI analysis into the security pipeline:
    1. Receives results from Slither, Aderyn and Echidna
    2. Analyzes the contract code
    3. Executes a 10-step professional audit
    4. Returns structured findings
    
    Requires:
    - anthropic Python SDK
    - ANTHROPIC_API_KEY env var
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        self.model = 'claude-sonnet-4-20250514'
        self.client = None
        
    def _init_client(self):
        """Lazily initialize Anthropic client (only when needed)."""
        if self.client is None:
            try:
                from anthropic import Anthropic
                if not self.api_key:
                    raise Exception("ANTHROPIC_API_KEY not set")
                self.client = Anthropic(api_key=self.api_key)
            except ImportError:
                raise Exception("anthropic package not installed. Run: pip install anthropic")
            except Exception as e:
                raise Exception(f"Failed to initialize Anthropic client: {str(e)}")
    
    async def scan(
        self, 
        contract_code: str,
        contract_name: str,
        slither_results: Dict = None,
        aderyn_results: Dict = None,
        echidna_results: Dict = None
    ) -> Dict:
        """Run Claude Mini-Audit on the contract.
        
        Args:
            contract_code: Solidity source code of the contract
            contract_name: Contract name
            slither_results: Slither results
            aderyn_results: Aderyn results
            echidna_results: Echidna results
            
        Returns:
            Dict with Claude's structured analysis
        """
        try:
            # Verifica se API key está disponível
            if not self.api_key:
                logger.warning("ANTHROPIC_API_KEY not set, skipping Claude audit")
                return {
                    "vulnerabilities": [],
                    "error": "ANTHROPIC_API_KEY not configured",
                    "skipped": True
                }
            
            # Inicializa cliente
            self._init_client()
            
            # Agrega findings de todas as ferramentas
            all_findings = self._aggregate_findings(
                slither_results,
                aderyn_results,
                echidna_results
            )
            
            # Executa mini-audit
            audit_result = await self._run_mini_audit(
                contract_code,
                contract_name,
                all_findings
            )
            
            return audit_result
            
        except Exception as e:
            logger.error(f"Claude scan failed: {str(e)}")
            return {
                "vulnerabilities": [],
                "error": str(e),
                "skipped": True
            }
    
    def _aggregate_findings(
        self,
        slither_results: Dict,
        aderyn_results: Dict,
        echidna_results: Dict
    ) -> List[Dict]:
        """Aggregate findings from all tools to send to Claude.
        
        Returns:
            List of normalized findings
        """
        findings = []
        
        # Slither findings
        if slither_results and slither_results.get("vulnerabilities"):
            for vuln in slither_results["vulnerabilities"][:10]:  # Top 10
                findings.append({
                    "source": "slither",
                    "severity": vuln.get("severity", "low"),
                    "type": vuln.get("type", "unknown"),
                    "description": vuln.get("description", ""),
                    "location": vuln.get("location", "")
                })
        
        # Aderyn findings
        if aderyn_results and aderyn_results.get("vulnerabilities"):
            for vuln in aderyn_results["vulnerabilities"][:10]:  # Top 10
                findings.append({
                    "source": "aderyn",
                    "severity": vuln.get("severity", "low"),
                    "type": vuln.get("id", "unknown"),
                    "description": vuln.get("title", ""),
                    "location": ", ".join(vuln.get("locations", []))
                })
        
        # Echidna findings
        if echidna_results and echidna_results.get("vulnerabilities"):
            for vuln in echidna_results["vulnerabilities"]:
                findings.append({
                    "source": "echidna",
                    "severity": "high",
                    "type": "assertion_failure",
                    "description": vuln.get("title", ""),
                    "location": vuln.get("function", "")
                })
        
        return findings
    
    async def _run_mini_audit(
        self,
        contract_code: str,
        contract_name: str,
        findings: List[Dict]
    ) -> Dict:
        """Execute the mini-audit with Claude.
        
        Args:
            contract_code: Contract source code
            contract_name: Contract name
            findings: Aggregated findings from tools
            
        Returns:
            Dict with audit result
        """
        try:
            system_prompt = self._get_audit_system_prompt()
            user_prompt = self._build_audit_prompt(
                contract_code,
                contract_name,
                findings
            )
            
            # Chama API Anthropic (síncrono, mas roda em executor)
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.messages.create(
                    model=self.model,
                    max_tokens=6000,
                    temperature=0.2,
                    system=system_prompt,
                    messages=[{
                        "role": "user",
                        "content": user_prompt
                    }]
                )
            )
            
            # Parseia resposta
            audit_data = self._parse_audit_response(response.content[0].text)
            
            # Extrai vulnerabilidades do formato Claude
            vulnerabilities = self._extract_vulnerabilities(audit_data)
            
            return {
                "vulnerabilities": vulnerabilities,
                "audit_data": audit_data,
                "tokens_used": {
                    "input": response.usage.input_tokens,
                    "output": response.usage.output_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"Error running Claude mini-audit: {str(e)}")
            raise
    
    def _get_audit_system_prompt(self) -> str:
        """Return the system prompt used for Claude."""
        return """You are a senior smart contract auditor with 5 years of experience.

You have worked on audits for DeFi protocols that manage billions of dollars.
Your specialty is performing fast yet deep architectural analysis.

## Your Methodology (Based on Real Auditors):

You will follow the 10 steps that professional auditors use:

1. **Purpose Understanding** - What should this contract do?
2. **Architecture Mapping** - What are the main components?
3. **Critical Points Identification** - Where are the main risk areas?
4. **Tool Analysis** - What did Slither/Aderyn/Echidna find?
5. **Logic Review** - Does the implementation make sense?
6. **Threat Modeling** - How would an attacker think?
7. **Edge Cases Verification** - What if...?
8. **Invariant Checking** - Are key properties always true?
9. **Economic Analysis** - Are incentives aligned?
10. **Risk Prioritization** - What is most urgent?

## Your Objective:

Perform a **structured mini-audit** that:
- Complements (does not replace) static tools
- Focuses on architecture and business logic
- Identifies issues that tools might miss
- Presents findings in an actionable way
- Gives the developer either confidence or clear concerns

## Important:

- Be HONEST about limitations (you do not have full context)
- Identify areas that need **deep human audit**
- Do not invent vulnerabilities – base everything on evidence
- Prioritize real impact vs. purely theoretical risk"""
    
    def _build_audit_prompt(
        self,
        contract_code: str,
        contract_name: str,
        findings: List[Dict]
    ) -> str:
        """Build the user prompt for Claude with code and findings."""
        
        findings_summary = "No findings from static tools"
        if findings:
            findings_summary = "\n".join([
                f"{i+1}. [{f['severity'].upper()}] {f['source']} - {f['type']}: {f['description'][:100]}"
                for i, f in enumerate(findings[:15])  # Top 15
            ])
        
        return f"""# Smart Contract Mini-Audit

## Contract: {contract_name}

## Contract Code
```solidity
{contract_code}
```

### Findings from Static Tools
{findings_summary}

---

# Your Task: Mini-Audit in 10 Steps

Perform a structured mini-audit following the 10 professional steps.
For each step, provide concise but actionable insights.

Return a JSON following this format:
```json
{{
  "audit_metadata": {{
    "contract_name": "{contract_name}",
    "complexity_score": <1-10>,
    "overall_risk": "critical|high|medium|low"
  }},
  
  "step_10_prioritized_findings": [
    {{
      "priority": 1,
      "severity": "critical|high|medium|low",
      "title": "Short descriptive title",
      "description": "Clear explanation",
      "impact": "What happens if exploited",
      "likelihood": "high|medium|low",
      "recommendation": "Specific action to take"
    }}
  ],
  
  "overall_assessment": {{
    "summary": "2-3 sentence overall assessment",
    "deploy_recommendation": "safe|needs_fixes|do_not_deploy",
    "reasoning": "Why this recommendation"
  }}
}}
```
## IMPORTANT RULES:

1. **Be specific** - Do not say "might have problems"; say "X can cause Y"
2. **Cite code** - Always reference specific lines or functions
3. **Prioritize** - Order findings by impact × likelihood
4. **Be honest** - If you are not sure, say so
5. **Think like an attacker** - "How would I steal money from this contract?"

Return ONLY the JSON, with no markdown or additional text."""
    
    def _parse_audit_response(self, response_text: str) -> Dict:
        """Parse Claude's JSON response."""
        clean_text = response_text.strip()
        
        # Remove markdown se presente
        if clean_text.startswith('```json'):
            clean_text = clean_text.split('```json')[1]
        if clean_text.endswith('```'):
            clean_text = clean_text[:clean_text.rfind('```')]
        clean_text = clean_text.strip()
        
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response: {e}")
            return {
                "error": f"Failed to parse response: {str(e)}",
                "raw_response": response_text[:500]
            }
    
    def _extract_vulnerabilities(self, audit_data: Dict) -> List[Dict]:
        """
        Extract vulnerabilities from Claude's audit data into the standard format.
        
        Args:
            audit_data: Claude audit data
            
        Returns:
            List of vulnerabilities in the standard format
        """
        vulnerabilities = []
        
        # Extrai findings priorizados
        findings = audit_data.get("step_10_prioritized_findings", [])
        
        for finding in findings:
            vulnerabilities.append({
                "source": "claude",
                "type": "ai_analysis",
                "title": finding.get("title", "Unknown Issue"),
                "severity": finding.get("severity", "medium"),
                "description": finding.get("description", ""),
                "impact": finding.get("impact", ""),
                "likelihood": finding.get("likelihood", "medium"),
                "recommendation": finding.get("recommendation", ""),
                "priority": finding.get("priority", 999)
            })
        
        # Ordena por priority
        vulnerabilities.sort(key=lambda x: x.get("priority", 999))
        
        return vulnerabilities
