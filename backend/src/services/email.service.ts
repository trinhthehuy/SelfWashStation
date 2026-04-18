import nodemailer from 'nodemailer';
import { SmtpSettingsService } from './smtp-settings.service.js';

type PasswordResetEmailPayload = {
  to: string;
  fullName?: string;
  resetUrl: string;
  expiresInMinutes: number;
};

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private transporterSignature = '';

  private canSend(settings: {
    enabled: boolean;
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  }): boolean {
    return Boolean(
      settings.enabled
      && settings.host
      && settings.port
      && settings.user
      && settings.pass
      && settings.from,
    );
  }

  private buildSignature(settings: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  }) {
    return [
      settings.enabled,
      settings.host,
      settings.port,
      settings.secure,
      settings.user,
      settings.pass,
      settings.from,
    ].join('|');
  }

  private async getRuntimeMailer(): Promise<{
    transporter: nodemailer.Transporter;
    from: string;
  } | null> {
    const settings = await SmtpSettingsService.getEffectiveSettings();

    if (!this.canSend(settings)) {
      this.transporter = null;
      this.transporterSignature = '';
      return null;
    }

    const signature = this.buildSignature(settings);

    if (!this.transporter || signature !== this.transporterSignature) {
      this.transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: {
          user: settings.user,
          pass: settings.pass,
        },
      });
      this.transporterSignature = signature;
    }

    return {
      transporter: this.transporter,
      from: settings.from,
    };
  }

  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<boolean> {
    const runtimeMailer = await this.getRuntimeMailer();
    if (!runtimeMailer) {
      return false;
    }

    const receiverName = String(payload.fullName || '').trim() || 'ban';
    const subject = '[XeSach365] Dat lai mat khau tai khoan';
    const text = [
      `Xin chao ${receiverName},`,
      '',
      'Chung toi da nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban.',
      `Lien ket dat lai mat khau (hieu luc ${payload.expiresInMinutes} phut, chi dung 1 lan):`,
      payload.resetUrl,
      '',
      'Neu ban khong yeu cau, vui long bo qua email nay.',
      '',
      'XeSach365',
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>Xin chao <strong>${receiverName}</strong>,</p>
        <p>Chung toi da nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban.</p>
        <p>
          Lien ket dat lai mat khau
          <strong>(hieu luc ${payload.expiresInMinutes} phut, chi dung 1 lan)</strong>:
        </p>
        <p>
          <a href="${payload.resetUrl}" target="_blank" rel="noopener noreferrer">${payload.resetUrl}</a>
        </p>
        <p>Neu ban khong yeu cau, vui long bo qua email nay.</p>
        <p>XeSach365</p>
      </div>
    `;

    try {
      await runtimeMailer.transporter.sendMail({
        from: runtimeMailer.from,
        to: payload.to,
        subject,
        text,
        html,
      });
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send password reset email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
