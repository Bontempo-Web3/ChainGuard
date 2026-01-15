import { ProjectDB, Project } from '../models/Project'

// Transform database project to frontend project interface
export function transformProjectForFrontend(projectDB: ProjectDB): Project {
  return {
    id: projectDB.id,
    userId: projectDB.user_id,
    projectName: projectDB.project_name,
    description: projectDB.description,
    projectType: projectDB.project_type,
    githubRepoUrl: projectDB.github_repo_url,
    githubRepoPath: projectDB.github_repo_path,
    zipFilePath: projectDB.zip_file_path,
    scanApproved: projectDB.scan_approved,
    isDeployed: projectDB.is_deployed,
    createdAt: projectDB.created_at,
    updatedAt: projectDB.updated_at
  }
}

// Transform multiple projects
export function transformProjectsForFrontend(projectsDB: ProjectDB[]): Project[] {
  return projectsDB.map(transformProjectForFrontend)
}
