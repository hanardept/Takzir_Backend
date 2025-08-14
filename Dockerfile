# Use official Node.js LTS image
FROM node:20-bullseye

#RUN apt-get update && apt-get install -y mongodb-tools
# RUN wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian92-x86_64-100.3.1.deb && \
#     apt install ./mongodb-database-tools-*.deb && \
#     rm -f mongodb-database-tools-*.deb

# RUN wget -qO- https://www.mongodb.org/static/pgp/server-8.0.asc | tee /etc/apt/trusted.gpg.d/server-8.0.asc
# RUN apt-get update && apt-get install -y mongodb-mongosh

# Install mongosh (MongoDB Shell)
RUN apt-get update && \
    apt-get install -y wget gnupg && \
    wget -qO- https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add - && \
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list && \
    apt-get update && \
    apt-get install -y mongodb-mongosh && \
    rm -rf /var/lib/apt/lists/*


# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Expose backend port (change if your app uses a different port)
EXPOSE 8080

# Start the backend
CMD ["npm", "start"]