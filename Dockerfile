FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 UPLOAD_DIR=/data/uploads
COPY --from=build /app/.output ./.output
RUN mkdir -p /data/uploads && chown -R node:node /data
EXPOSE 3000
USER node
CMD ["node", ".output/server/index.mjs"]
