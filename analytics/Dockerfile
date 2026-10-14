FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ARG SOURCE_COMMIT
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000 ANALYTICS_DATA_DIR=/app/analytics-data SOURCE_COMMIT=$SOURCE_COMMIT
COPY --chown=node:node analytics ./analytics
RUN mkdir -p /app/analytics-data && chown node:node /app/analytics-data
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:8000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "analytics/server.mjs"]
