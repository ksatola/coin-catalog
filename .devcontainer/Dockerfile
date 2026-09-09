FROM python:3.14.7-slim

ARG UV_VERSION=0.12.10
ARG NODE_VERSION=24.20.0

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        build-essential \
        xz-utils \
    && case "$(dpkg --print-architecture)" in \
        amd64) NODE_ARCH="x64" ;; \
        arm64) NODE_ARCH="arm64" ;; \
        *) echo "Unsupported architecture: $(dpkg --print-architecture)" && exit 1 ;; \
    esac \
    && NODE_TARBALL="node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}" \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" \
    && grep " ${NODE_TARBALL}$" SHASUMS256.txt | sha256sum -c - \
    && tar -xJf "${NODE_TARBALL}" -C /usr/local --strip-components=1 \
    && rm -f "${NODE_TARBALL}" SHASUMS256.txt \
    && node --version \
    && npm --version \
    && curl -LsSf "https://astral.sh/uv/${UV_VERSION}/install.sh" | sh \
    && mv /root/.local/bin/uv /usr/local/bin/uv \
    && mv /root/.local/bin/uvx /usr/local/bin/uvx \
    && uv --version \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

CMD ["sleep", "infinity"]
