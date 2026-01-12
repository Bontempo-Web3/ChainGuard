import asyncio
import logging
from git import Repo

logger = logging.getLogger(__name__)

class GitHandler:
    async def clone_repository(self, repository: str, target_dir: str, commit: str):
        try:
            # Handle both full URL and repository name formats
            if repository.startswith('http'):
                repo_url = repository if repository.endswith('.git') else f"{repository}.git"
            else:
                repo_url = f"https://github.com/{repository}.git"
            
            logger.info(f"Cloning {repo_url} to {target_dir}")
            
            loop = asyncio.get_event_loop()
            
            # Clone with specific branch if provided, otherwise clone default branch
            if commit and commit not in ['main', 'master', 'HEAD']:
                # Clone without depth limit to get all history for specific commit
                repo = await loop.run_in_executor(
                    None,
                    lambda: Repo.clone_from(repo_url, target_dir)
                )
                logger.info(f"Checking out commit {commit}")
                await loop.run_in_executor(None, repo.git.checkout, commit)
            else:
                # For main/master/HEAD, just clone the default branch with depth=1
                repo = await loop.run_in_executor(
                    None,
                    lambda: Repo.clone_from(repo_url, target_dir, depth=1)
                )
                current_branch = repo.active_branch.name
                logger.info(f"Cloned default branch: {current_branch}")
            
            logger.info("Repository cloned and checked out successfully")
            
        except Exception as e:
            logger.error(f"Failed to clone repository: {str(e)}")
            raise Exception(f"Git clone failed: {str(e)}")
