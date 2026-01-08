#!/usr/bin/env python3

import json
import os
import sys
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Any
import anthropic

class ChainGuardScanner:
    def __init__(self, severity: str, tools: str, target: str, fail_on_detection: bool, 
                 claude_audit: bool = False, anthropic_api_key: str = ''):
        self.severity = severity
        self.tools = tools
        self.target = target
        self.fail_on_detection = fail_on_detection
        self.claude_audit = claude_audit
        self.anthropic_api_key = anthropic_api_key
        self.results = {
            'critical': [],
            'high': [],
            'medium': [],
            'low': []
        }
        self.all_findings = []
        
    def run_slither(self) -> List[Dict[str, Any]]:
        """Run Slither analysis"""
        print("Running Slither analysis...")
        
        try:
            result = subprocess.run(
                ['slither', self.target, '--json', '-'],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.stdout:
                data = json.loads(result.stdout)
                if data.get('success') and 'results' in data:
                    detectors = data['results'].get('detectors', [])
                    print(f"   Found {len(detectors)} issues with Slither")
                    return detectors
            
            return []
            
        except subprocess.TimeoutExpired:
            print("   WARNING: Slither timeout (5 minutes)")
            return []
        except Exception as e:
            print(f"   WARNING: Slither error: {str(e)}")
            return []
    
    def run_aderyn(self) -> List[Dict[str, Any]]:
        """Run Aderyn analysis"""
        print("Running Aderyn analysis...")
        
        try:
            # Run Aderyn (generates report.md by default)
            cwd = self.target if os.path.isdir(self.target) else os.path.dirname(self.target) or '.'
            result = subprocess.run(
                ['aderyn', '.'],
                capture_output=True,
                text=True,
                timeout=300,
                cwd=cwd
            )
            
            # Aderyn may crash after generating report.md, so we read report.md
            report_path = os.path.join(cwd, 'report.md')
            if os.path.exists(report_path):
                issues = self._parse_aderyn_report(report_path)
                print(f"   Found {len(issues)} issues with Aderyn")
                return issues
            
            return []
            
        except subprocess.TimeoutExpired:
            print("   WARNING: Aderyn timeout (5 minutes)")
            return []
        except Exception as e:
            print(f"   WARNING: Aderyn error: {str(e)}")
            return []
    
    def _parse_aderyn_report(self, report_path: str) -> List[Dict[str, Any]]:
        """Parse Aderyn report.md and extract issues"""
        issues = []
        try:
            with open(report_path, 'r') as f:
                content = f.read()
            
            import re
            
            # Extract High Issues
            high_matches = re.findall(r'## H-\d+: ([^\n]+)', content)
            for title in high_matches:
                issues.append({
                    'severity': 'high',
                    'title': title.strip(),
                    'description': title.strip(),
                    'contract': 'See report.md'
                })
            
            # Extract Low Issues
            low_matches = re.findall(r'## L-\d+: ([^\n]+)', content)
            for title in low_matches:
                issues.append({
                    'severity': 'low',
                    'title': title.strip(),
                    'description': title.strip(),
                    'contract': 'See report.md'
                })
            
            return issues
        except Exception as e:
            print(f"   WARNING: Error parsing Aderyn report: {str(e)}")
            return []
    
    def normalize_slither_results(self, detectors: List[Dict]) -> None:
        """Normalize Slither results into severity buckets"""
        for detector in detectors:
            impact = detector.get('impact', 'low').lower()
            
            issue = {
                'tool': 'Slither',
                'type': detector.get('check', 'unknown'),
                'description': detector.get('description', 'No description'),
                'severity': impact,
                'locations': []
            }
            
            for element in detector.get('elements', []):
                if 'source_mapping' in element:
                    location = element['source_mapping'].get('filename_short', 'unknown')
                    issue['locations'].append(location)
            
            if impact == 'high':
                self.results['critical'].append(issue)
            elif impact == 'medium':
                self.results['high'].append(issue)
            elif impact == 'low':
                self.results['medium'].append(issue)
            else:
                self.results['low'].append(issue)
    
    def normalize_aderyn_results(self, issues: List[Dict]) -> None:
        """Normalize Aderyn results into severity buckets"""
        for issue in issues:
            severity = issue.get('severity', 'low').lower()
            
            normalized = {
                'tool': 'Aderyn',
                'type': issue.get('title', 'Unknown'),
                'description': issue.get('description', 'No description'),
                'severity': severity,
                'locations': [issue.get('contract', 'unknown')]
            }
            
            self.all_findings.append(normalized)
            
            if severity == 'critical':
                self.results['critical'].append(normalized)
            elif severity == 'high':
                self.results['high'].append(normalized)
            elif severity == 'medium':
                self.results['medium'].append(normalized)
            else:
                self.results['low'].append(normalized)
    
    def run_echidna(self) -> List[Dict[str, Any]]:
        """Run Echidna fuzzing analysis"""
        print("Running Echidna fuzzing...")
        
        try:
            # Check if Echidna is available
            check = subprocess.run(
                ['echidna', '--version'],
                capture_output=True,
                timeout=5
            )
            
            if check.returncode != 0:
                print("   WARNING: Echidna not available")
                return []
            
            # Find Solidity files
            sol_files = list(Path(self.target).rglob('*.sol'))
            if not sol_files:
                print("   No .sol files found")
                return []
            
            # Test first contract only (for speed in CI)
            contract_file = sol_files[0]
            contract_name = self._extract_contract_name(str(contract_file))
            
            if not contract_name:
                print("   Could not extract contract name")
                return []
            
            # Run Echidna with quick test limit
            result = subprocess.run(
                [
                    'echidna',
                    str(contract_file),
                    '--contract', contract_name,
                    '--test-mode', 'assertion',
                    '--test-limit', '5000',
                    '--format', 'text'
                ],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=self.target if os.path.isdir(self.target) else os.path.dirname(self.target)
            )
            
            vulnerabilities = []
            if result.stdout:
                for line in result.stdout.split('\n'):
                    if ': failed!' in line.lower():
                        function_name = line.split(':')[0].strip()
                        vulnerabilities.append({
                            'type': 'assertion_failure',
                            'title': f'Assertion failed in {function_name}',
                            'description': f'Echidna found inputs that break the assertion',
                            'severity': 'high',
                            'function': function_name
                        })
            
            print(f"   Found {len(vulnerabilities)} issues with Echidna")
            return vulnerabilities
            
        except subprocess.TimeoutExpired:
            print("   WARNING: Echidna timeout (2 minutes)")
            return []
        except Exception as e:
            print(f"   WARNING: Echidna error: {str(e)}")
            return []
    
    def _extract_contract_name(self, file_path: str) -> str:
        """Extract main contract name from a .sol file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            import re
            matches = re.findall(r'contract\s+(\w+)', content)
            
            if matches:
                for match in matches:
                    if not re.search(rf'abstract\s+contract\s+{match}', content):
                        return match
                return matches[0]
            
            return ""
        except Exception:
            return ""
    
    def normalize_echidna_results(self, vulnerabilities: List[Dict]) -> None:
        """Normalize Echidna results into severity buckets"""
        for vuln in vulnerabilities:
            severity = vuln.get('severity', 'high').lower()
            
            normalized = {
                'tool': 'Echidna',
                'type': vuln.get('type', 'Unknown'),
                'description': vuln.get('description', 'No description'),
                'severity': severity,
                'locations': [vuln.get('function', 'unknown')]
            }
            
            self.all_findings.append(normalized)
            
            if severity == 'critical':
                self.results['critical'].append(normalized)
            elif severity == 'high':
                self.results['high'].append(normalized)
            elif severity == 'medium':
                self.results['medium'].append(normalized)
            else:
                self.results['low'].append(normalized)
    
    def run_claude_audit(self) -> None:
        """Run Claude Mini-Audit"""
        if not self.claude_audit or not self.anthropic_api_key:
            return
        
        print("Running Claude Mini-Audit...")
        
        try:
            # Find .sol files, excluding out/, lib/, cache/ directories
            all_sol = list(Path(self.target).rglob('*.sol'))
            sol_files = [
                f for f in all_sol 
                if f.is_file() and not any(
                    part in str(f) for part in ['/out/', '/lib/', '/cache/', '/node_modules/']
                )
            ]
            if not sol_files:
                print("   No .sol files found")
                return
            
            contract_code = ''
            for sol_file in sol_files[:3]:
                with open(sol_file, 'r') as f:
                    contract_code += f"\n// File: {sol_file.name}\n{f.read()}\n"
            
            findings_context = '\n'.join([
                f"- [{f['severity'].upper()}] {f['type']} ({f['tool']}): {f['description'][:100]}"
                for f in self.all_findings[:10]
            ])
            
            client = anthropic.Anthropic(api_key=self.anthropic_api_key)
            
            prompt = f"""Analyze this Solidity smart contract for security vulnerabilities.

Other tools found these issues:
{findings_context}

Contract code:
{contract_code[:8000]}

Provide a brief security assessment focusing on:
1. Critical vulnerabilities
2. Business logic issues
3. Additional concerns not caught by static analysis

Format: List 3-5 key findings with severity (critical/high/medium/low)."""
            
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            print(f"   Claude analysis completed")
            print(f"\n--- Claude Mini-Audit Report ---")
            print(response_text[:2000])
            print(f"--- End of Claude Report ---\n")
            
            lines = response_text.split('\n')
            for line in lines:
                if any(sev in line.lower() for sev in ['critical', 'high', 'medium', 'low']):
                    severity = 'medium'
                    if 'critical' in line.lower():
                        severity = 'critical'
                    elif 'high' in line.lower():
                        severity = 'high'
                    elif 'low' in line.lower():
                        severity = 'low'
                    
                    issue = {
                        'tool': 'Claude',
                        'type': 'AI Analysis',
                        'description': line.strip(),
                        'severity': severity,
                        'locations': ['AI-detected']
                    }
                    
                    self.results[severity].append(issue)
            
        except Exception as e:
            print(f"   WARNING: Claude error: {str(e)}")
    
    def scan(self) -> Dict[str, int]:
        """Run the security scan"""
        if self.tools in ['slither', 'both']:
            slither_results = self.run_slither()
            self.normalize_slither_results(slither_results)
        
        if self.tools in ['aderyn', 'both']:
            aderyn_results = self.run_aderyn()
            self.normalize_aderyn_results(aderyn_results)
        
        # Always run Echidna fuzzing
        echidna_results = self.run_echidna()
        self.normalize_echidna_results(echidna_results)
        
        if self.claude_audit:
            self.run_claude_audit()
        
        counts = {
            'critical': len(self.results['critical']),
            'high': len(self.results['high']),
            'medium': len(self.results['medium']),
            'low': len(self.results['low'])
        }
        
        return counts
    
    def print_summary(self, counts: Dict[str, int]) -> None:
        """Print scan summary"""
        total = sum(counts.values())
        
        print("\n" + "="*50)
        print("SCAN SUMMARY")
        print("="*50)
        print(f"Critical: {counts['critical']}")
        print(f"High:     {counts['high']}")
        print(f"Medium:   {counts['medium']}")
        print(f"Low:      {counts['low']}")
        print(f"Total:    {total}")
        print("="*50)
        
        if counts['critical'] > 0 or counts['high'] > 0:
            print("\nVULNERABILITIES DETECTED")
            print("\nCritical/High severity issues found:")
            
            for issue in self.results['critical'][:3]:
                print(f"\n[CRITICAL] [{issue['tool']}] {issue['type']}")
                print(f"   {issue['description'][:100]}...")
            
            for issue in self.results['high'][:3]:
                print(f"\n[HIGH] [{issue['tool']}] {issue['type']}")
                print(f"   {issue['description'][:100]}...")
        else:
            print("\nNO CRITICAL VULNERABILITIES FOUND")
    
    def set_outputs(self, counts: Dict[str, int]) -> None:
        """Set GitHub Action outputs"""
        github_output = os.getenv('GITHUB_OUTPUT')
        if not github_output:
            return
        
        total = sum(counts.values())
        passed = counts['critical'] == 0 and counts['high'] == 0
        
        with open(github_output, 'a') as f:
            f.write(f"critical-count={counts['critical']}\n")
            f.write(f"high-count={counts['high']}\n")
            f.write(f"medium-count={counts['medium']}\n")
            f.write(f"low-count={counts['low']}\n")
            f.write(f"total-count={total}\n")
            f.write(f"scan-result={'passed' if passed else 'failed'}\n")
    
    def should_fail(self, counts: Dict[str, int]) -> bool:
        """Determine if the action should fail"""
        if not self.fail_on_detection:
            return False
        
        severity_levels = {
            'critical': 0,
            'high': 1,
            'medium': 2,
            'low': 3
        }
        
        threshold = severity_levels.get(self.severity, 1)
        
        if threshold <= 0 and counts['critical'] > 0:
            return True
        if threshold <= 1 and counts['high'] > 0:
            return True
        if threshold <= 2 and counts['medium'] > 0:
            return True
        if threshold <= 3 and counts['low'] > 0:
            return True
        
        return False

def main():
    parser = argparse.ArgumentParser(description='ChainGuard Security Scanner')
    parser.add_argument('--severity', default='high', help='Severity threshold')
    parser.add_argument('--tools', default='both', help='Tools to run')
    parser.add_argument('--claude-audit', default='false', help='Enable Claude Mini-Audit')
    parser.add_argument('--anthropic-api-key', default='', help='Anthropic API key')
    parser.add_argument('--target', default='.', help='Target to scan')
    parser.add_argument('--fail-on-detection', default='true', help='Fail on detection')
    parser.add_argument('--github-token', default='', help='GitHub token')
    
    args = parser.parse_args()
    
    fail_on_detection = args.fail_on_detection.lower() == 'true'
    claude_audit = args.claude_audit.lower() == 'true'
    
    scanner = ChainGuardScanner(
        severity=args.severity,
        tools=args.tools,
        target=args.target,
        fail_on_detection=fail_on_detection,
        claude_audit=claude_audit,
        anthropic_api_key=args.anthropic_api_key
    )
    
    counts = scanner.scan()
    scanner.print_summary(counts)
    scanner.set_outputs(counts)
    
    if scanner.should_fail(counts):
        sys.exit(1)
    
    sys.exit(0)

if __name__ == '__main__':
    main()
