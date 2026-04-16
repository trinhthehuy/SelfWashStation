## Run Locally

### Prerequisites

* Node.js >= 18
* npm

### Installation

1. Clone repository
git clone https://github.com/trinhthehuy/SelfWashStation-backend.git
2. Go to project folder
cd SelfWashStation-backend
3. Install dependencies
npm install
4. Run development server
npm run dev
5. Open browser
http://localhost:3000

### MQTT via .env

Backend doc duoc cau hinh MQTT tu file `.env` o root workspace:

- `MQTT_BROKER` (hoac `MQTT_URL`)
- `MQTT_USER` (hoac `MQTT_USERNAME`)
- `MQTT_PASS` (hoac `MQTT_PASSWORD`)

Sau khi sua `.env`, can restart Backend de ap dung cau hinh moi.