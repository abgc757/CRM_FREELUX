FROM node:22-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static

RUN mkdir -p ./public
COPY --from=base /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
