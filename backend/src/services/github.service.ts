import { Octokit } from 'octokit';
import { GitHubRepo, GitHubUser } from '../types';

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    return {
      id: data.id,
      login: data.login,
      name: data.name || data.login,
      avatar_url: data.avatar_url,
      email: data.email,
    };
  }

  async getRepositories(): Promise<GitHubRepo[]> {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description,
      default_branch: repo.default_branch,
      language: repo.language,
      updated_at: repo.updated_at || '',
    }));
  }

  async getRepository(owner: string, repo: string) {
    const { data } = await this.octokit.rest.repos.get({
      owner,
      repo,
    });
    return data;
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch?: string
  ) {
    try {
      console.log(`Checking if file exists: ${path}`);
      const { data: existingFile } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      console.log('File exists, updating...');
      if ('sha' in existingFile) {
        return await this.octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString('base64'),
          sha: existingFile.sha,
          branch,
        });
      }
    } catch (error: any) {
      if (error.status === 404) {
        console.log('File does not exist, creating new file...');
        console.log(`Owner: ${owner}, Repo: ${repo}, Path: ${path}, Branch: ${branch || 'default'}`);
        
        const base64Content = Buffer.from(content).toString('base64');
        console.log(`Content length: ${content.length}, Base64 length: ${base64Content.length}`);
        
        try {
          const payload = {
            owner,
            repo,
            path,
            message,
            content: base64Content,
            ...(branch && { branch }),
          };
          console.log('Payload:', JSON.stringify(payload, null, 2));
          
          const result = await this.octokit.rest.repos.createOrUpdateFileContents(payload);
          console.log('File created successfully');
          return result;
        } catch (createError: any) {
          console.error('Error creating file:', createError.status, createError.message);
          console.error('Error details:', JSON.stringify(createError.response?.data, null, 2));
          throw createError;
        }
      }
      throw error;
    }
  }
}
