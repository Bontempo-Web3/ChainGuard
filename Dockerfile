FROM python:3.11-slim

LABEL maintainer="Marilia and Marcos Bontempo"
LABEL description="ChainGuard Security Scanner for Solidity Smart Contracts"

WORKDIR /action

# Install system dependencies including Rust
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust (required for Aderyn)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Python security tools
RUN pip install --no-cache-dir \
    slither-analyzer==0.10.0 \
    solc-select==1.0.4 \
    anthropic==0.39.0

# Install Solidity compiler
RUN solc-select install 0.8.20 && solc-select use 0.8.20

# Install Aderyn
RUN cargo install aderyn

COPY entrypoint.sh /action/entrypoint.sh
COPY scanner.py /action/scanner.py

RUN chmod +x /action/entrypoint.sh

ENTRYPOINT ["/action/entrypoint.sh"]
