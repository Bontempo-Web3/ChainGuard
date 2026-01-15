-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(20) NOT NULL CHECK (project_type IN ('github', 'zip', 'deployed')),
  github_repo_url TEXT,
  github_repo_path TEXT,
  zip_file_path TEXT,
  scan_approved BOOLEAN DEFAULT false,
  is_deployed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_project_type ON projects(project_type);
CREATE INDEX idx_projects_scan_approved ON projects(scan_approved);
CREATE INDEX idx_projects_is_deployed ON projects(is_deployed);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_project_name ON projects(project_name);

-- Create composite indexes for common queries
CREATE INDEX idx_projects_user_type ON projects(user_id, project_type);
CREATE INDEX idx_projects_user_deployed ON projects(user_id, is_deployed);
