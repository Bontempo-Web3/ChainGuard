import { GitHubService } from './github.service';

const CHAINGUARD_WORKFLOW = `name: ChainGuard Security Scan

on:
  push:
    branches: [ main, develop ]
    paths:
      - '**/*.sol'
  pull_request:
    branches: [ main, develop ]
    paths:
      - '**/*.sol'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Run ChainGuard Security Scan
        uses: Bontempo-Web3/ChainGuard@v1
        with:
          contracts-path: './contracts'
          
      - name: Upload Scan Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: chainguard-results
          path: chainguard-results.json
`;

export class ActionsService {
  private githubService: GitHubService;

  constructor(token: string) {
    this.githubService = new GitHubService(token);
  }

  async setupChainGuardAction(owner: string, repo: string, contractsPath: string = './contracts') {
    const workflowPath = '.github/workflows/chainguard.yml';
    
    const customWorkflow = CHAINGUARD_WORKFLOW.replace(
      "contracts-path: './contracts'",
      `contracts-path: '${contractsPath}'`
    );

    try {
      console.log(`Creating workflow file: ${workflowPath}`);
      console.log(`Repository: ${owner}/${repo}`);
      
      // First, verify we can access the repository
      console.log('Verifying repository access...');
      const repoData = await this.githubService.getRepository(owner, repo);
      console.log(`Repository found: ${repoData.full_name}`);
      console.log(`Default branch: ${repoData.default_branch}`);
      console.log(`Permissions - admin: ${repoData.permissions?.admin}, push: ${repoData.permissions?.push}, pull: ${repoData.permissions?.pull}`);
      
      await this.githubService.createOrUpdateFile(
        owner,
        repo,
        workflowPath,
        customWorkflow,
        'Add ChainGuard security scan workflow',
        repoData.default_branch
      );

      return {
        success: true,
        message: 'ChainGuard GitHub Action added successfully',
        workflow_path: workflowPath,
      };
    } catch (error: any) {
      console.error('GitHub API Error:', error.status, error.message);
      console.error('Error response:', error.response?.data);
      throw new Error(`Failed to add GitHub Action: ${error.message}`);
    }
  }

  async checkWorkflowExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.githubService.getRepository(owner, repo);
      return true;
    } catch (error) {
      return false;
    }
  }
}
