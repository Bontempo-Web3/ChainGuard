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
            # Check if API key is available
            if not self.api_key:
                logger.warning("ANTHROPIC_API_KEY not set, skipping Claude audit")
                return {
                    "vulnerabilities": [],
                    "error": "ANTHROPIC_API_KEY not configured",
                    "skipped": True
                }
            
            # Initialize client
            self._init_client()
            
            # Aggregate findings from all tools
            all_findings = self._aggregate_findings(
                slither_results,
                aderyn_results,
                echidna_results
            )
            
            # Execute mini-audit
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
            
            # Call Anthropic API (synchronous, but runs in executor)
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
    
    async def infer_business_rules(self, contract_code: str, contract_name: str) -> Dict:
        """Infer business rules and invariants from contract code.
        
        Args:
            contract_code: Solidity source code
            contract_name: Contract name
            
        Returns:
            Dict with inferred business rules categorized by type
        """
        try:
            if not self.api_key:
                logger.warning("ANTHROPIC_API_KEY not set, skipping business rules inference")
                return {"rules": [], "error": "ANTHROPIC_API_KEY not configured"}
            
            self._init_client()
            
            system_prompt = """You are a smart contract analyst specializing in extracting business rules and invariants from Solidity code.

Your task is to analyze the contract and infer:
1. Access Control Rules - Who can call what functions
2. Financial Invariants - Rules about balances, fees, limits
3. State Invariants - Properties that must always hold
4. User Flow Rules - Expected sequences of operations
5. Integration Rules - How this contract interacts with others

Be specific and base everything on the actual code. Do not invent rules that aren't evidenced in the code."""

            user_prompt = f"""Analyze this smart contract and extract all business rules and invariants:

## Contract: {contract_name}

```solidity
{contract_code[:8000]}
```

Return a JSON with the following structure:
```json
{{
  "contract_name": "{contract_name}",
  "rules": [
    {{
      "id": "rule_1",
      "category": "access_control|financial|state_invariant|user_flow|integration",
      "description": "Clear description of the rule in English",
      "code_reference": "Function or line that evidences this rule",
      "testable": true,
      "test_hint": "How to test this rule"
    }}
  ],
  "summary": {{
    "total_rules": 0,
    "by_category": {{
      "access_control": 0,
      "financial": 0,
      "state_invariant": 0,
      "user_flow": 0,
      "integration": 0
    }}
  }}
}}
```

IMPORTANT:
- Extract 5-15 meaningful rules
- Focus on testable properties
- Be specific about code references
- Return ONLY valid JSON"""

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.messages.create(
                    model=self.model,
                    max_tokens=4000,
                    temperature=0.1,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}]
                )
            )
            
            return self._parse_rules_response(response.content[0].text)
            
        except Exception as e:
            logger.error(f"Business rules inference failed: {str(e)}")
            return {"rules": [], "error": str(e)}
    
    def _parse_rules_response(self, response_text: str) -> Dict:
        """Parse business rules JSON response."""
        clean_text = response_text.strip()
        
        if clean_text.startswith('```json'):
            clean_text = clean_text.split('```json')[1]
        if clean_text.startswith('```'):
            clean_text = clean_text[3:]
        if clean_text.endswith('```'):
            clean_text = clean_text[:clean_text.rfind('```')]
        clean_text = clean_text.strip()
        
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse rules response: {e}")
            return {"rules": [], "error": f"Parse error: {str(e)}"}
    
    async def generate_tests_from_rules(
        self, 
        contract_code: str, 
        contract_name: str, 
        selected_rules: List[Dict]
    ) -> Dict:
        """Generate Foundry tests from confirmed business rules.
        
        Args:
            contract_code: Solidity source code
            contract_name: Contract name
            selected_rules: List of confirmed business rules
            
        Returns:
            Dict with generated test code and metadata
        """
        try:
            if not self.api_key:
                return {"tests": [], "error": "ANTHROPIC_API_KEY not configured"}
            
            self._init_client()
            
            rules_text = "\n".join([
                f"{i+1}. [{r.get('category', 'unknown')}] {r.get('description', '')}\n   Code: {r.get('code_reference', 'N/A')}\n   Hint: {r.get('test_hint', 'N/A')}"
                for i, r in enumerate(selected_rules)
            ])
            
            system_prompt = """You are a Solidity test expert. Generate simple Foundry tests.

ARCHITECTURE - MUST FOLLOW:
1. ONE mock contract only (the contract being tested)
2. ONE test contract (extends Test)
3. NO helper contracts, NO script contracts, NO factory contracts
4. Test deploys mock DIRECTLY with new MockContract() - test IS the owner

OWNER PATTERN - CRITICAL:
```
contract MockBot {
    address public owner;
    constructor() { owner = msg.sender; }  // deployer is owner
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
}

contract BotTest is Test {
    MockBot bot;
    function setUp() public {
        bot = new MockBot();  // TEST is owner - no prank needed!
    }
    function test_OwnerCanCall() public {
        bot.ownerFunction();  // Works! We deployed it, we're owner
    }
    function test_NonOwnerReverts() public {
        vm.prank(address(0x123));
        vm.expectRevert("Not owner");
        bot.ownerFunction();
    }
}
```

SYNTAX RULES:
1. Struct getters return tuples: (address a, uint b, ...) = contract.config();
2. vm.* cheatcodes ONLY in test contract (extends Test), NOT in mocks
3. vm.expectRevert only works before EXTERNAL calls (to other contracts), NOT internal functions
4. Do NOT test environment variable edge cases (vm.envUint, vm.envAddress with empty/zero values) - Foundry behavior is unreliable

OUTPUT:
- ONLY Solidity code, NO markdown
- Start: // SPDX-License-Identifier: MIT
- Import: forge-std/Test.sol"""

            user_prompt = f"""Generate Foundry tests for the following business rules:

## Contract: {contract_name}

## Contract Code (for reference):
```solidity
{contract_code[:6000]}
```

## Business Rules to Test:
{rules_text}

Generate a complete, compilable Foundry test file that tests ALL the rules above.
Start directly with // SPDX-License-Identifier: MIT"""

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.messages.create(
                    model=self.model,
                    max_tokens=4000,
                    temperature=0.1,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}]
                )
            )
            
            test_code = self._extract_solidity_code(response.content[0].text)
            
            return {
                "status": "success",
                "contract_name": contract_name,
                "test_code": test_code,
                "rules_tested": len(selected_rules),
                "tokens_used": {
                    "input": response.usage.input_tokens,
                    "output": response.usage.output_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"Test generation failed: {str(e)}")
            return {"status": "error", "error": str(e), "test_code": ""}
    
    def _extract_solidity_code(self, response: str) -> str:
        """Extract Solidity code from response, removing markdown."""
        response = response.strip()
        
        if response.startswith("```solidity"):
            response = response[11:]
        elif response.startswith("```sol"):
            response = response[6:]
        elif response.startswith("```"):
            response = response[3:]
        
        if response.endswith("```"):
            response = response[:-3]
        
        if "```solidity" in response:
            start = response.find("```solidity") + 11
            end = response.rfind("```")
            if end > start:
                response = response[start:end]
        
        return response.strip()
    
    async def fix_failing_tests(
        self,
        test_code: str,
        test_output: str,
        contract_name: str
    ) -> Dict:
        """Fix failing tests based on error output.
        
        Args:
            test_code: Original generated test code
            test_output: Forge test output with failures
            contract_name: Name of the contract being tested
            
        Returns:
            Dict with fixed test code
        """
        try:
            if not self.api_key:
                return {"status": "error", "error": "ANTHROPIC_API_KEY not configured", "test_code": test_code}
            
            self._init_client()
            
            system_prompt = """You are a Solidity test debugging expert. Fix the failing tests.

ARCHITECTURE FIX - If you see "Not owner" errors:
1. REMOVE all helper/script/factory contracts
2. Keep ONLY: one MockContract + one TestContract
3. Test must deploy mock directly: bot = new MockBot();
4. Test IS the owner - call owner functions directly, NO vm.prank needed

EXAMPLE OF CORRECT PATTERN:
```
contract MockBot {
    address public owner;
    constructor() { owner = msg.sender; }
    function ownerFunc() external { require(msg.sender == owner); }
}
contract BotTest is Test {
    MockBot bot;
    function setUp() public { bot = new MockBot(); }  // test IS owner
    function test_Works() public { bot.ownerFunc(); }  // direct call - works!
}
```

OTHER FIXES:
1. "Undeclared identifier vm": Remove vm.* from mock contracts, only use in Test
2. Struct tuples: (address a, ...) = contract.config();
3. "call didn't revert at a lower depth" OR "Not owner" after vm.expectRevert:
   - Look for tests using vm.expectRevert before calling internal functions like deployBot(), configureBot(), etc.
   - REMOVE THE ENTIRE TEST FUNCTION if it uses vm.expectRevert + internal function
   - vm.expectRevert ONLY works before external calls (contractInstance.function())
4. "next call did not revert as expected": Remove tests checking env var edge cases

OUTPUT: ONLY fixed Solidity code, start with // SPDX-License-Identifier: MIT"""

            user_prompt = f"""Fix the failing tests for {contract_name}.

## Current Test Code:
```solidity
{test_code}
```

## Test Output (with failures):
```
{test_output[:2000]}
```

Fix ALL failing tests and output the complete corrected test file.
Start directly with // SPDX-License-Identifier: MIT"""

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.messages.create(
                    model=self.model,
                    max_tokens=4000,
                    temperature=0.1,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}]
                )
            )
            
            fixed_code = self._extract_solidity_code(response.content[0].text)
            
            return {
                "status": "success",
                "test_code": fixed_code,
                "tokens_used": {
                    "input": response.usage.input_tokens,
                    "output": response.usage.output_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"Test fix failed: {str(e)}")
            return {"status": "error", "error": str(e), "test_code": test_code}
