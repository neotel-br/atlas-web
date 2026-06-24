FROM node:22-alpine3.23 AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS dev

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

FROM deps AS build

COPY . .
RUN npm run build

FROM nginx:stable-trixie-perl AS prod

ARG VCS_REF=local
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="atlas" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

COPY nginx/atlas.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/out /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD curl -fsS http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
