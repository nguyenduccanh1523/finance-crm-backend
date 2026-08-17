# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

# Cài đầy đủ dependency để Nest/TypeScript có thể build.
FROM node:${NODE_VERSION}-bookworm-slim AS dependencies
WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable --inline-builds

# Compile src/**/*.ts thành dist/.
FROM dependencies AS build
COPY . .
RUN yarn build

# Loại devDependencies khỏi node_modules trước khi copy sang runtime.
FROM dependencies AS production-dependencies
RUN yarn workspaces focus --all --production

# Image cuối không chứa Nest CLI, TypeScript, Jest hay ESLint.
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./

USER node
EXPOSE 3000

CMD ["node", "dist/main"]
