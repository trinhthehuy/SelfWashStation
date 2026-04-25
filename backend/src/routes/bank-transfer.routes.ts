import { Router, type Request, type Response } from 'express';
import { authenticateToken, authorizeRoles, type AuthRequest } from '../middleware/auth.js';
import { ApiTokenService } from '../services/api-token.service.js';
import { BankTransferService } from '../services/bank-transfer.service.js';
import { DevModeService } from '../services/dev-mode.service.js';
import { mqttService } from '../services/mqtt.service.js';
import { SmtpSettingsService } from '../services/smtp-settings.service.js';

const router = Router();

async function handleWebhookAuth(req: Request, res: Response) {
  const authorized = await ApiTokenService.authenticateWebhookRequest(req);

  if (!authorized) {
    res.status(401).json({ error: 'Token API không hợp lệ hoặc chưa được cấu hình' });
    return false;
  }

  return true;
}

router.post('/webhook/bank-transfer', async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const isDevTestHeader = String(req.headers['x-dev-test'] || '').toLowerCase() === 'true';

  console.log('[WEBHOOK][INCOMING]', {
    requestId,
    path: '/api/webhook/bank-transfer',
    isDevTestHeader,
    transferType: req.body?.transferType,
    transactionId: req.body?.id || req.body?.transactionId || req.body?.paymentId || null,
    referenceCode: req.body?.referenceCode || null,
  });

  if (isDevTestHeader && !DevModeService.isEnabled()) {
    console.warn('[WEBHOOK][REJECTED]', { requestId, reason: 'dev_mode_disabled' });
    res.status(401).json({ error: 'Token API không hợp lệ hoặc chưa được cấu hình' });
    return;
  }

  if (isDevTestHeader && !mqttService.getStatus()) {
    console.warn('[WEBHOOK][REJECTED]', { requestId, reason: 'mqtt_not_connected_for_dev_test' });
    res.status(503).json({ error: 'MQTT chưa kết nối, không thể gửi lệnh' });
    return;
  }

  if (!(await handleWebhookAuth(req, res))) {
    console.warn('[WEBHOOK][REJECTED]', { requestId, reason: 'auth_failed' });
    return;
  }

  try {
    const result = await BankTransferService.processIncomingTransfer(req.body, {
      isTest: isDevTestHeader || req.body?.isTest === true,
      requestId,
    });
    console.log('[WEBHOOK][DONE]', {
      requestId,
      success: result?.success === true,
      ignored: result?.ignored === true,
      duplicate: result?.duplicate === true,
      mqttQueued: result?.mqttQueued ?? null,
      mqttTopic: result?.mqttTopic ?? null,
      message: result?.message ?? null,
    });
    res.json(result);
  } catch (error: any) {
    console.error('[WEBHOOK][ERROR]', {
      requestId,
      message: error?.message || 'Lỗi xử lý webhook',
      stack: error?.stack || null,
    });
    res.status(400).json({ error: error.message || 'Lỗi xử lý webhook' });
  }
});

router.post('/webhook/outgoing-payment', async (req, res) => {
  if (!(await handleWebhookAuth(req, res))) {
    return;
  }

  try {
    const result = await BankTransferService.addOutgoingTransaction(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Lỗi xử lý outgoing payment' });
  }
});

router.use(authenticateToken);

router.get('/tokens', authorizeRoles(['sa', 'engineer']), async (_req, res, next) => {
  try {
    const tokens = await ApiTokenService.getTokensDisplay();
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

router.post('/tokens/create', authorizeRoles(['sa', 'engineer']), async (req, res) => {
  try {
    const { name, expiresInDays } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Tên token không được để trống' });
      return;
    }

    const { plainToken, tokenData } = await ApiTokenService.createToken(String(name), Number(expiresInDays) || undefined);
    res.json({
      success: true,
      token: plainToken,
      fullToken: plainToken,
      expiresAt: tokenData.expiresAt,
      message: 'TOKEN CHI HIEN THI MOT LAN'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Lỗi tạo token' });
  }
});

router.post('/tokens/delete', authorizeRoles(['sa', 'engineer']), async (req, res) => {
  try {
    await ApiTokenService.deleteToken(String(req.body.tokenId || ''));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi xóa token' });
  }
});

router.get('/tokens/dev-mode/status', authorizeRoles(['sa', 'engineer']), (_req, res) => {
  res.json(DevModeService.getStatus());
});

router.post('/tokens/dev-mode/toggle', authorizeRoles(['sa', 'engineer']), (_req, res) => {
  const enabled = DevModeService.toggle();
  res.json({
    success: true,
    devModeEnabled: enabled,
    message: enabled ? 'Dev Mode ON' : 'Dev Mode OFF'
  });
});

router.get('/mqtt-status', authorizeRoles(['sa', 'engineer']), (_req, res) => {
  res.json({ connected: mqttService.getStatus() });
});

router.post('/settings/refresh', authorizeRoles(['sa', 'engineer']), async (_req, res, next) => {
  try {
    await mqttService.refresh();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/settings/mqtt', authorizeRoles(['sa', 'engineer']), async (req, res, next) => {
  try {
    const { mqttBroker, mqttUser, mqttPass } = req.body;
    await mqttService.initialize({
      brokerUrl: mqttBroker,
      username: mqttUser,
      password: mqttPass
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/settings/smtp', authorizeRoles(['sa']), async (_req, res, next) => {
  try {
    const data = await SmtpSettingsService.getAdminViewSettings();
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/settings/smtp', authorizeRoles(['sa']), async (req: AuthRequest, res, next) => {
  try {
    const data = await SmtpSettingsService.updateSettings({
      enabled: req.body?.enabled,
      host: req.body?.host,
      port: req.body?.port,
      secure: req.body?.secure,
      user: req.body?.user,
      pass: req.body?.pass,
      from: req.body?.from,
    }, req.user?.id || null);
    res.json({
      message: 'Đã cập nhật cấu hình SMTP',
      data,
    });
  } catch (error: any) {
    if (error.message) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.get('/test-transactions', authorizeRoles(['sa', 'engineer']), async (req: AuthRequest, res, next) => {
  try {
    const transactions = await BankTransferService.getTestTransactions(50, req.user?.role === 'agency' ? req.user.agencyId : null);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

router.get('/outgoing-transactions', authorizeRoles(['sa', 'engineer']), async (_req, res, next) => {
  try {
    const transactions = await BankTransferService.getOutgoingTransactions(50);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

router.get('/integration-transactions', authorizeRoles(['sa', 'engineer']), async (req: AuthRequest, res, next) => {
  try {
    const transactions = await BankTransferService.getTransactions(50, req.user?.role === 'agency' ? req.user.agencyId : null);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

export default router;
