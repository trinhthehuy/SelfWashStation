// src/server.ts
import { createApp } from './app.js';
import { initDb } from './db/index.js';
import config from './config/index.js';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { SystemAuthService } from './services/system-auth.service.js';
import { mqttService } from './services/mqtt.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    // 1. Khởi tạo Database
    await initDb();
    await SystemAuthService.bootstrapDefaultAccounts();
    await mqttService.initialize();

    // 2. Tạo Express app
    const app = createApp();

    const distPath = path.join(process.cwd(), 'dist/client');

    if (config.nodeEnv === 'production' || config.nodeEnv === 'staging') {
      // Phục vụ file tĩnh
      app.use(express.static(distPath, { index: false }));

      // Xử lý SPA cho các route không phải API
      app.get('*', (req: express.Request, res: express.Response) => {
        if (!req.url.startsWith('/api')) {
          res.sendFile(path.join(distPath, 'index.html'), (err: Error | null) => {
            if (err) {
              res.status(500).send('Frontend build not found.');
            }
          });
        }
      });
    }

    // 3. Lắng nghe trên 0.0.0.0
    const PORT = config.port;
    app.listen(PORT, '0.0.0.0', () => {
      const isStaging = config.nodeEnv === 'staging';
      
      // LOGIC HIỂN THỊ LOG THÔNG MINH
      let remoteDisplay = config.corsOrigin ? config.corsOrigin : `localhost:${PORT}`;
      
      if (isStaging && config.corsOrigin) {
        // Nếu corsOrigin đã có http/https thì dùng luôn, không thì mặc định https
        remoteDisplay = config.corsOrigin.includes('://') 
          ? config.corsOrigin 
          : `https://${config.corsOrigin}`;
        
        // Nếu là domain Tailscale Funnel, thường không cần hiện cổng :8080 ở cuối log
        if (remoteDisplay.includes('ts.net') && !remoteDisplay.includes(':')) {
           // Giữ nguyên để người dùng click link chuẩn (Funnel chạy qua 443)
        } else {
           remoteDisplay = `${remoteDisplay}:${PORT}`;
        }
      } else {
        remoteDisplay = `http://localhost:${PORT}`;
      }

      console.log('---');
      console.log(`🚀 SelfWashStation Server is running!`);
      console.log(`🏠 Local:   http://localhost:${PORT}`);
      console.log(`🌐 Remote:  ${remoteDisplay}`); // Không nối thêm http:// ở đây nữa
      console.log(`🌍 Env:     ${config.nodeEnv.toUpperCase()}`);
      console.log(`📂 Static:  ${distPath}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();