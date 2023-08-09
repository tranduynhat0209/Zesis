# ziden-backup-service

## > Getting Started

### Step 1: Set up the Development Environment

You need to set up your development environment before you can do anything.

Install [Node.js and NPM](https://nodejs.org/en/download/)

Install MongoDB

### Step 2: Setup the project

Fork or download this project.

Then copy the `.env.example` file and rename it to `.env`. In this file you have to add your database connection information, your JWT sercet, your Port to run server
Create a new database with the name you have in your `.env`-file.


Install dependencies
```
npm i
```

### Step 3: Start the server

Run
```
npm start
```

## > API Routes

Access API Docs at
```
http[s]:<hostname>[:<port>]/api-docs
```

## > Project Structure

| Name                              | Description |
| --------------------------------- | ----------- |
| **logs/**                         | Logs of the running process  |
| **src/**                          | Source files |
| **src/common/**                   | Setup common variables and functions |
| **src/controllers/**              | REST API Controllers |
| **src/routes/**                   | Routing configuration |
| **src/services/**                 | Services layer |
| **src/util/**                     | General purposed utility functions |
| **swagger/**                      | Your swagger config |
| .env.example                      | Environment configurations example |

## > Docker


## > Test
Check file [`test.ts`](./src/test.ts) to know how to encrypt and decrypt your data.

