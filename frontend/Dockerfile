FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Run in development mode
CMD ["npm", "run", "dev"]