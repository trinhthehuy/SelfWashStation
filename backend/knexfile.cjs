// knexfile.cjs
// @ts-ignore
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const sharedEnvCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '../.env')
];

const sharedEnvPath = sharedEnvCandidates.find((candidate) => fs.existsSync(candidate));
if (sharedEnvPath) {
  dotenv.config({ path: sharedEnvPath });
} else {
  dotenv.config();
}

const dbConfig = {
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: {
      ca: fs.readFileSync(path.resolve(__dirname, process.env.CA_PEM_PATH || 'ca.pem')),
      rejectUnauthorized: false
    }
  },
  migrations: { directory: './migrations' },
  seeds: { directory: './seeds' }
};

module.exports = {
  development: dbConfig,
  staging: dbConfig,
  production: dbConfig
};