-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_address VARCHAR(42) NOT NULL,
  network VARCHAR(50) NOT NULL,
  chain_id VARCHAR(20) NOT NULL,
  contract_name VARCHAR(255) NOT NULL,
  token_decimals INTEGER,
  deployment_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT contracts_address_network_unique UNIQUE (contract_address, network)
);

-- Note: Foreign key for deployment_id will be added when deployments table is created
-- ALTER TABLE contracts ADD CONSTRAINT contracts_deployment_id_fkey 
--   FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_contracts_address ON contracts(contract_address);
CREATE INDEX idx_contracts_network ON contracts(network);
CREATE INDEX idx_contracts_chain_id ON contracts(chain_id);
CREATE INDEX idx_contracts_deployment_id ON contracts(deployment_id);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);

-- Create composite indexes for common queries
CREATE INDEX idx_contracts_project_network ON contracts(project_id, network);
CREATE INDEX idx_contracts_address_network ON contracts(contract_address, network);
