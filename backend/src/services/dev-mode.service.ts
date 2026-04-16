export class DevModeService {
  private static enabled = process.env.NODE_ENV !== 'production';

  static isEnabled() {
    return this.enabled;
  }

  static toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  static getStatus() {
    return {
      enabled: this.enabled,
      isDevelopmentEnv: process.env.NODE_ENV !== 'production'
    };
  }
}