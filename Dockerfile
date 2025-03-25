# -------- Development stage -------- 
FROM node:20.19.0-slim AS development

# Install libvips dependencies
RUN apt-get update && apt-get install -y \
    build-essential python3 meson ninja-build wget \
    gobject-introspection libglib2.0-dev \
    libgirepository1.0-dev \
    libexpat1-dev libfftw3-dev libgif-dev libgsf-1-dev \
    libheif-dev libde265-dev libx265-dev libtiff-dev libspng-dev \
    libjpeg-dev libpng-dev libexif-dev librsvg2-dev  \
    libwebp-dev libtiff5-dev pkg-config libopenjp2-7-dev \
    libpango1.0-dev libcairo2-dev \
    procps

# Install libvips 
RUN cd /tmp \
    && wget https://github.com/libvips/libvips/releases/download/v8.16.1/vips-8.16.1.tar.xz \
    && tar xf vips-8.16.1.tar.xz \
    && cd vips-8.16.1 \
    && meson setup build \
    && cd build \
    && meson compile \
    && meson test \
    && meson install \
    && ldconfig \
    && cd / \
    && rm -rf /tmp/vips-8.16.1* \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package definition files and install all dependencies (including dev)
COPY package*.json ./
RUN npm install

# Reinstall sharp against the runtime libraries
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1
RUN npm uninstall sharp && npm install --build-from-source sharp

# Copy source code
COPY . .

# Expose application port
EXPOSE 4000

# Set Node environment to development and start the app with hot reload
ENV NODE_ENV=development
CMD ["npm", "run", "start:dev"]


# -------- Build stage (production) -------- 
FROM node:20.19.0-slim AS builder

# Install libvips dependencies
RUN apt-get update && apt-get install -y \
    build-essential python3 meson ninja-build wget \
    gobject-introspection libglib2.0-dev \
    libgirepository1.0-dev \
    libexpat1-dev libfftw3-dev libgif-dev libgsf-1-dev \
    libheif-dev libde265-dev libx265-dev libtiff-dev libspng-dev \
    libjpeg-dev libpng-dev libexif-dev librsvg2-dev  \
    libwebp-dev libtiff5-dev pkg-config libopenjp2-7-dev \
    libpango1.0-dev libcairo2-dev \
    procps

# Install libvips 
RUN cd /tmp \
    && wget https://github.com/libvips/libvips/releases/download/v8.16.1/vips-8.16.1.tar.xz \
    && tar xf vips-8.16.1.tar.xz \
    && cd vips-8.16.1 \
    && meson setup build \
    && cd build \
    && meson compile \
    && meson test \
    && meson install \
    && ldconfig \
    && cd / \
    && rm -rf /tmp/vips-8.16.1* \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies (including dev for build tools)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript to JavaScript
COPY . .
RUN npm run build 

# Remove development dependencies after build to reduce size
RUN npm prune --omit=dev


# -------- Production stage -------- 
FROM node:20.19.0-slim AS production

# Install libvips dependencies
RUN apt-get update && apt-get install -y \
    build-essential python3 meson ninja-build wget \
    gobject-introspection libglib2.0-dev \
    libgirepository1.0-dev \
    libexpat1-dev libfftw3-dev libgif-dev libgsf-1-dev \
    libheif-dev libde265-dev libx265-dev libtiff-dev libspng-dev \
    libjpeg-dev libpng-dev libexif-dev librsvg2-dev  \
    libwebp-dev libtiff5-dev pkg-config libopenjp2-7-dev \
    libpango1.0-dev libcairo2-dev \
    procps

# Install libvips 
RUN cd /tmp \
    && wget https://github.com/libvips/libvips/releases/download/v8.16.1/vips-8.16.1.tar.xz \
    && tar xf vips-8.16.1.tar.xz \
    && cd vips-8.16.1 \
    && meson setup build \
    && cd build \
    && meson compile \
    && meson test \
    && meson install \
    && ldconfig \
    && cd / \
    && rm -rf /tmp/vips-8.16.1* \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Reinstall sharp against the runtime libraries
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1
RUN npm uninstall sharp && npm install --build-from-source sharp

# Expose the application port
EXPOSE 4000

# Set Node environment to production and define the startup command
ENV NODE_ENV=production
CMD ["npm", "run", "start:prod"]
