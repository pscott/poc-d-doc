FROM node:20-slim

WORKDIR /app

# Install SQLite
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files and database
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"] 