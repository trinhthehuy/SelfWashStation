// config/index.ts
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveSharedEnvPath() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(__dirname, '../../../.env'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

const sharedEnvPath = resolveSharedEnvPath();
if (sharedEnvPath) {
  dotenv.config({ path: sharedEnvPath });
} else {
  dotenv.config();
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  nodeEnv: nodeEnv,
  corsOrigin: process.env.CORS_ORIGIN,
  
  // Cấu hình Database (Dùng cho Knex hoặc các service khác)
  db: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    caPemPath: process.env.CA_PEM_PATH || './ca.pem',
  },

  // Cấu hình MQTT
  mqtt: {
    broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
    port: parseInt(process.env.MQTT_PORT || '1883', 10),
    user: process.env.MQTT_USER || '',
    pass: process.env.MQTT_PASS || '',
  },
};

export default config;