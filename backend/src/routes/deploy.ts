import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { ContractRepository } from '../repositories/ContractRepository';

const execAsync = promisify(exec);
const router = express.Router();

interface DeployRequest {
  projectId: number;
  network: string;
  contractName?: string;
}

router.post('/', async (req, res) => {
  try {
    const { projectId, network, contractName } = req.body as DeployRequest;
    const userId = (req.session as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!projectId || !network) {
      return res.status(400).json({ error: 'Missing required fields: projectId, network' });
    }

    const project = await ProjectRepository.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('Deploy authorization check:', {
      sessionUserId: userId,
      projectUserId: project.user_id,
      projectId: project.id
    });

    if (project.user_id !== userId) {
      return res.status(403).json({ 
        error: 'Not authorized to deploy this project',
        debug: { sessionUserId: userId, projectUserId: project.user_id }
      });
    }

    if (project.projectType !== 'github' && project.projectType !== 'zip') {
      return res.status(400).json({ error: 'Only GitHub and ZIP projects can be deployed' });
    }

    const tempDir = path.join('/tmp', `chainguard_deploy_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      let contractsPath: string;

      if (project.projectType === 'github' && project.githubRepoUrl) {
        console.log(`Cloning repository: ${project.githubRepoUrl}`);
        await execAsync(`git clone ${project.githubRepoUrl} ${tempDir}`);
        contractsPath = path.join(tempDir, project.githubRepoPath || '.');
      } else if (project.projectType === 'zip' && project.zipFilePath) {
        console.log(`Extracting ZIP: ${project.zipFilePath}`);
        await execAsync(`unzip -q ${project.zipFilePath} -d ${tempDir}`);
        contractsPath = tempDir;
      } else {
        throw new Error('Invalid project configuration');
      }

      console.log(`Compiling contracts at: ${contractsPath}`);
      
      const { stdout: buildOutput } = await execAsync('forge build --json', {
        cwd: contractsPath,
        maxBuffer: 10 * 1024 * 1024
      });

      const outDir = path.join(contractsPath, 'out');
      const contractFiles = await fs.readdir(outDir);
      
      let targetContract = contractName;
      if (!targetContract) {
        const solFiles = contractFiles.filter(f => f.endsWith('.sol'));
        if (solFiles.length === 0) {
          throw new Error('No compiled contracts found');
        }
        targetContract = solFiles[0].replace('.sol', '');
      }

      const contractDir = path.join(outDir, `${targetContract}.sol`);
      const contractJsonPath = path.join(contractDir, `${targetContract}.json`);
      
      const contractJson = JSON.parse(await fs.readFile(contractJsonPath, 'utf-8'));
      
      const bytecode = contractJson.bytecode?.object || contractJson.bytecode;
      const abi = contractJson.abi;

      if (!bytecode || !abi) {
        throw new Error('Contract compilation failed: missing bytecode or ABI');
      }

      await fs.rm(tempDir, { recursive: true, force: true });

      res.json({
        success: true,
        contractName: targetContract,
        bytecode,
        abi,
        network
      });

    } catch (error: any) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }

  } catch (error: any) {
    console.error('Deploy compilation error:', error);
    res.status(500).json({ 
      error: 'Failed to compile contract',
      details: error.message 
    });
  }
});

router.post('/save', async (req, res) => {
  try {
    const { 
      projectId, 
      contractAddress, 
      network, 
      chainId, 
      contractName,
      transactionHash 
    } = req.body;
    
    const userId = (req.session as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const project = await ProjectRepository.findById(projectId);
    
    if (!project || project.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const contract = await ContractRepository.create({
      project_id: projectId,
      contract_address: contractAddress,
      network,
      chain_id: chainId.toString(),
      contract_name: contractName,
      token_decimals: null,
      deployment_id: null
    });

    await ProjectRepository.update(projectId, { isDeployed: true });

    res.json({
      success: true,
      contract,
      transactionHash
    });

  } catch (error: any) {
    console.error('Save deployment error:', error);
    res.status(500).json({ 
      error: 'Failed to save deployment',
      details: error.message 
    });
  }
});

export default router;
