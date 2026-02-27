FROM oven/bun:alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lockb* ./
RUN bun install

# Copy the rest of the application code
COPY . .

# Run in development mode
CMD ["bun", "run", "dev"]