# syntax=docker/dockerfile:1
#
# Multi-stage build:
#   - Stage "builder" installs ALL deps and compiles the frontend (Vite)
#     and the server bundle (esbuild -> dist/server.cjs).
#   - Stage "runner" ships only production deps + the build output, so the
#     final image is small and has a smaller attack surface.

# ---------- Stage 1: build ----------
FROM node:20-slim AS builder
WORKDIR /app

# Copy manifests first so this layer is cached unless deps change.
COPY package.json package-lock.json ./
# `npm ci` is reproducible: it installs the exact versions from the lockfile.
RUN npm ci

# Vite inlines these PUBLIC values into the frontend bundle at BUILD time.
# Railway forwards matching service variables as --build-arg automatically.
# (All of these are public-safe: anon key, cloud name, upload preset, maps key.)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME \
    VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Copy the rest of the source and build.
COPY . .
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies end up in the final image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Bring over the compiled frontend + server bundle from the build stage.
COPY --from=builder /app/dist ./dist

# Drop root: run as the unprivileged built-in "node" user.
USER node

# Documentation only — Railway injects the real PORT at runtime.
EXPOSE 3000

# Container-level liveness probe. Railway also probes via railway.json;
# this makes `docker run` and other orchestrators healthy-aware too.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.cjs"]
