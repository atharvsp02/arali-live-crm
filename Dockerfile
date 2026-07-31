FROM node:22-alpine AS build

RUN corepack enable

WORKDIR /workspace

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @live-crm/server db:generate
RUN pnpm build
RUN pnpm --filter @live-crm/server deploy --prod /output/server

FROM node:22-alpine AS runtime

RUN corepack enable

ENV NODE_ENV=production

WORKDIR /app/apps/server

COPY --from=build /output/server ./
COPY --from=build /workspace/apps/web/dist /app/apps/web/dist

EXPOSE 4000

CMD ["node", "dist/api.js"]
