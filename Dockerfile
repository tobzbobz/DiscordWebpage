FROM node:24-slim

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . ./

RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
