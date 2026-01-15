import { Router, Request, Response } from 'express';
import { ProjectRepository } from '../../repositories/ProjectRepository';
import { ContractRepository } from '../../repositories/ContractRepository';
import { transformProjectForFrontend } from '../../lib/projectTransform';
import { transformContractForFrontend } from '../../lib/contractTransform';

const router = Router();

// POST /api/projects/monitor - Monitor deployed contract
router.post('/monitor', async (req: Request, res: Response) => {
  try {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get form data
    const { contractName, contractAddress, network, chainId, tokenDecimals } = req.body;

    // Validation
    if (!contractName || !contractName.trim()) {
      return res.status(400).json({ error: 'Contract name is required' });
    }

    if (!contractAddress || !contractAddress.trim()) {
      return res.status(400).json({ error: 'Contract address is required' });
    }

    // Validate Ethereum address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(contractAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }

    if (!network || !chainId) {
      return res.status(400).json({ error: 'Network and chain ID are required' });
    }

    // Validate token decimals if provided
    if (tokenDecimals !== undefined && tokenDecimals !== '') {
      const decimals = parseInt(tokenDecimals);
      if (isNaN(decimals) || decimals < 0 || decimals > 18) {
        return res.status(400).json({ error: 'Token decimals must be between 0 and 18' });
      }
    }

    // Check if contract already exists on this network
    const existingContract = await ContractRepository.findByAddressAndNetwork(
      contractAddress,
      network
    );

    if (existingContract) {
      return res.status(409).json({ 
        error: 'This contract is already being monitored on this network' 
      });
    }

    // Step 1: Create project with type 'deployed'
    const projectDB = await ProjectRepository.create({
      user_id: req.session.userId,
      project_name: contractName,
      description: `Monitoring ${contractName} on ${network}`,
      project_type: 'deployed',
      scan_approved: true,
      is_deployed: true
    });

    // Step 2: Create contract entry linked to the project
    const contractDB = await ContractRepository.create({
      project_id: projectDB.id,
      contract_address: contractAddress,
      network: network,
      chain_id: chainId,
      contract_name: contractName,
      token_decimals: tokenDecimals ? parseInt(tokenDecimals) : null,
      deployment_id: null
    });

    // Transform for frontend
    const project = transformProjectForFrontend(projectDB);
    const contract = transformContractForFrontend(contractDB);

    res.status(201).json({
      message: 'Contract added to monitoring successfully',
      project,
      contract
    });

  } catch (error: any) {
    console.error('Monitor contract error:', error);
    res.status(500).json({ 
      error: 'Failed to add contract to monitoring',
      details: error.message 
    });
  }
});

export default router;
