#!/usr/bin/env node

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    args[key] = value;
    if (value !== 'true') i += 1;
  }
  return args;
}

function printUsage() {
  console.log('Usage: node scripts/auth-reset-smoke.mjs --username <username> --newPassword <newPassword> [--baseUrl <url>]');
  console.log('Default baseUrl: http://localhost:3000/api');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help === 'true' || args.h === 'true') {
    printUsage();
    process.exit(0);
  }

  const baseUrl = String(args.baseUrl || 'http://localhost:3000/api').replace(/\/$/, '');
  const username = String(args.username || '').trim();
  const newPassword = String(args.newPassword || '').trim();

  if (!username || !newPassword) {
    printUsage();
    process.exit(1);
  }

  console.log('[1/3] POST /auth/forgot-password');
  const forgotRes = await requestJson(`${baseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  console.log(`  status=${forgotRes.status}`);
  console.log(`  message=${forgotRes.data?.message || ''}`);

  const token = String(forgotRes.data?.resetToken || '').trim();
  if (!token) {
    console.error('  No resetToken returned. In production this is expected; run in non-production or capture token from delivery channel.');
    process.exit(2);
  }

  console.log('[2/3] GET /auth/reset-password/:token');
  const validateRes = await requestJson(`${baseUrl}/auth/reset-password/${encodeURIComponent(token)}`);
  console.log(`  status=${validateRes.status}`);
  console.log(`  valid=${String(Boolean(validateRes.data?.valid))}`);

  if (!validateRes.data?.valid) {
    console.error('  Token is invalid before reset. Abort.');
    process.exit(3);
  }

  console.log('[3/3] POST /auth/reset-password');
  const resetRes = await requestJson(`${baseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  console.log(`  status=${resetRes.status}`);
  console.log(`  message=${resetRes.data?.message || ''}`);

  if (!resetRes.ok) {
    process.exit(4);
  }

  const validateAgainRes = await requestJson(`${baseUrl}/auth/reset-password/${encodeURIComponent(token)}`);
  console.log('[check] token should be invalid after use');
  console.log(`  status=${validateAgainRes.status}`);
  console.log(`  valid=${String(Boolean(validateAgainRes.data?.valid))}`);

  if (validateAgainRes.data?.valid) {
    console.error('  Token is still valid after reset. This should not happen.');
    process.exit(5);
  }

  console.log('Smoke test completed successfully.');
}

main().catch((error) => {
  console.error('Smoke test failed:', error?.message || error);
  process.exit(9);
});
