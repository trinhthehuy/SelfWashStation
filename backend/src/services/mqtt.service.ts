import mqtt from 'mqtt';

type MqttConfig = {
  brokerUrl?: string;
  username?: string;
  password?: string;
};

class IntegratedMqttService {
  private client: mqtt.MqttClient | null = null;
  private config: MqttConfig = {};
  private connected = false;

  async initialize(config?: MqttConfig) {
    if (config) {
      this.config = {
        brokerUrl: config.brokerUrl || this.config.brokerUrl,
        username: config.username || this.config.username,
        password: config.password || this.config.password
      };
    }

    const envBroker = process.env.MQTT_BROKER || process.env.MQTT_URL || '';
    const envUsername = process.env.MQTT_USER || process.env.MQTT_USERNAME || undefined;
    const envPassword = process.env.MQTT_PASS || process.env.MQTT_PASSWORD || undefined;
    const brokerUrl = this.config.brokerUrl || envBroker;

    console.log('[MQTT][INIT]', {
      brokerUrl: brokerUrl || null,
      hasUsername: Boolean(this.config.username || envUsername),
      hasPassword: Boolean(this.config.password || envPassword),
    });

    if (!brokerUrl) {
      this.connected = false;
      console.warn('[MQTT][INIT] broker url is empty, skip connect');
      return;
    }

    if (this.client) {
      this.client.end(true);
      this.client = null;
    }

    this.client = mqtt.connect(brokerUrl, {
      username: this.config.username || envUsername,
      password: this.config.password || envPassword,
      reconnectPeriod: 3000,
      connectTimeout: 10000
    });

    this.client.on('connect', () => {
      this.connected = true;
      console.log('[MQTT][CONNECTED]');
    });

    this.client.on('close', () => {
      this.connected = false;
      console.warn('[MQTT][CLOSED] connection closed');
    });

    this.client.on('error', (error) => {
      this.connected = false;
      console.error('[MQTT][ERROR]', error);
    });
  }

  async publish(topic: string, message: string) {
    if (!this.client || !this.connected) {
      console.warn('[MQTT][PUBLISH_SKIPPED]', {
        reason: !this.client ? 'client_not_initialized' : 'client_not_connected',
        topic,
      });
      return false;
    }

    return new Promise<boolean>((resolve) => {
      this.client!.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          console.error('[MQTT][PUBLISH_ERROR]', { topic, error: error.message });
          resolve(false);
          return;
        }

        console.log('[MQTT][PUBLISHED]', { topic, message });
        resolve(true);
      });
    });
  }

  async refresh() {
    await this.initialize();
  }

  getStatus() {
    return this.connected;
  }
}

export const mqttService = new IntegratedMqttService();
