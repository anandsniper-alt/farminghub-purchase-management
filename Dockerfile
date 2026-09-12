FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000 FH_DATA_DIR=/app/data
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node shared ./shared
COPY --chown=node:node web ./web
COPY --chown=node:node templates ./templates
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:8000/api/health || exit 1
CMD ["node", "server/index.mjs"]
