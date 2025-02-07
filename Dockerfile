FROM node
WORKDIR /usr/src/node

COPY ./package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "build:dev"]
CMD ["npm", "run", "start:dev"]