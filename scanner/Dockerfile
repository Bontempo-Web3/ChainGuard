# ChainGuard Scanner - Multi-stage build for optimization
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Rust (needed for Aderyn)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:${PATH}"
RUN foundryup

# Install Aderyn via cargo
RUN cargo install aderyn

# Install Echidna (automated fuzzing)
RUN curl -L https://github.com/crytic/echidna/releases/download/v2.2.4/echidna-2.2.4-x86_64-linux.tar.gz -o echidna.tar.gz && \
    tar -xzf echidna.tar.gz && \
    chmod +x echidna && \
    mv echidna /usr/local/bin/echidna && \
    rm echidna.tar.gz

# Final stage
FROM python:3.11-slim

# Install runtime dependencies (including build tools for Python packages)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libssl-dev \
    build-essential \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy Rust, Foundry, Aderyn, and Echidna from builder
COPY --from=builder /root/.cargo /root/.cargo
COPY --from=builder /root/.foundry /root/.foundry
COPY --from=builder /root/.rustup /root/.rustup
COPY --from=builder /usr/local/bin/echidna /usr/local/bin/echidna

# Set PATH and configure Rust
ENV PATH="/root/.cargo/bin:/root/.foundry/bin:${PATH}"
ENV RUSTUP_HOME="/root/.rustup"
ENV CARGO_HOME="/root/.cargo"

# Install Python security tools
RUN pip install --no-cache-dir \
    slither-analyzer==0.10.0 \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    pydantic==2.5.3 \
    aiohttp==3.9.1 \
    anthropic==0.75.0

# Note: Not installing solc-select due to ARM compatibility issues
# Slither will use Foundry's forge as the Solidity compiler instead

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create cache directory
RUN mkdir -p /app/.cache

# Configure Slither to use Foundry as default compiler
RUN mkdir -p /root/.config/slither && \
    echo '{"solc": "forge"}' > /root/.config/slither/slither.config.json

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run the scanner service
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
