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

    if (!brokerUrl) {
      this.connected = false;
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
      console.log('MQTT connected');
    });

    this.client.on('close', () => {
      this.connected = false;
      console.warn('MQTT connection closed');
    });

    this.client.on('error', (error) => {
      this.connected = false;
      console.error('MQTT error:', error);
    });
  }

  async publish(topic: string, message: string) {
    if (!this.client || !this.connected) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      this.client!.publish(topic, message, { qos: 1 }, (error) => {
        resolve(!error);
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