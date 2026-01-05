#!/usr/bin/env python3
"""
Full pipeline test: Slither + Aderyn + Echidna + Claude
"""

import asyncio
from scanner_orchestrator import ScannerOrchestrator

async def test_pipeline():
    print('=' * 80)
    print('TEST: Full Pipeline')
    print('Slither → Aderyn → Echidna → Claude Sonnet 4')
    print('=' * 80)
    
    orch = ScannerOrchestrator()
    project_dir = '/contracts/examples'
    
    # PHASE 1: Scanners in parallel
    print('\n[PHASE 1] Slither + Aderyn + Echidna (parallel)...')
    
    slither_results = await orch.slither.scan(project_dir)
    aderyn_results = await orch.aderyn.scan(project_dir)
    echidna_results = await orch.echidna.scan(project_dir, test_limit=5000)
    
    print(f'  Slither:  {len(slither_results.get("vulnerabilities", []))} issues')
    print(f'  Aderyn:   {len(aderyn_results.get("vulnerabilities", []))} issues')
    print(f'  Echidna:  {len(echidna_results.get("vulnerabilities", []))} issues')
    
    # PHASE 2: Claude with findings context
    print('\n[PHASE 2] Claude Sonnet 4 (with findings context)...')
    
    with open('/contracts/examples/src/VulnerableVault.sol', 'r') as f:
        contract_code = f.read()
    
    claude_results = await orch.claude.scan(
        contract_code,
        'VulnerableVault',
        slither_results,
        aderyn_results,
        echidna_results
    )
    
    if claude_results.get('skipped'):
        print(f'\n  ERRO: {claude_results.get("error")}')
        return
    
    # Results
    tokens = claude_results.get('tokens_used', {})
    cost = ((tokens.get('input', 0) / 1_000_000) * 3.0 + 
           (tokens.get('output', 0) / 1_000_000) * 15.0)
    
    print(f'  Vulnerabilities: {len(claude_results.get("vulnerabilities", []))}')
    print(f'  Tokens: {tokens.get("input", 0):,} in / {tokens.get("output", 0):,} out')
    print(f'  Cost: ${cost:.4f}')
    
    # Findings
    print('\n' + '=' * 80)
    print('TOP 5 FINDINGS FROM CLAUDE')
    print('=' * 80)
    
    for i, v in enumerate(claude_results.get('vulnerabilities', [])[:5], 1):
        print(f'\n{i}. [{v.get("severity", "?").upper()}] {v.get("title", "Unknown")}')
        print(f'   Priority: {v.get("priority", "N/A")}')
        desc = v.get('description', '')
        if desc:
            print(f'   {desc[:150]}...')
    
    # Assessment
    if 'audit_data' in claude_results:
        audit = claude_results['audit_data']
        if 'overall_assessment' in audit:
            assessment = audit['overall_assessment']
            print('\n' + '=' * 80)
            print('OVERALL ASSESSMENT')
            print('=' * 80)
            print(f'\nDeploy: {assessment.get("deploy_recommendation", "N/A")}')
            print(f'Confidence: {assessment.get("confidence_level", "N/A")}')
            print(f'\n{assessment.get("summary", "N/A")}')
    
    print('\n' + '=' * 80)
    print('TEST COMPLETE')
    print('=' * 80)

if __name__ == '__main__':
    asyncio.run(test_pipeline())
