import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { scheduleCurrencyRefresh } from './services/currencyService.js';
import { ensureRolePermissionsSeeded } from './services/permissionService.js';
 
const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`🚜 FH-VMS API running on http://localhost:${env.port} [${env.nodeEnv}]`);
  // Auto-refresh currency rates from the internet on boot + every 12h
  scheduleCurrencyRefresh({ onBoot: true, everyHours: 12 });
  // Make sure the role permission matrix rows exist
  ensureRolePermissionsSeeded().catch((e) => console.warn('role perms seed skipped:', e.message));
});
 
async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if it hangs
  setTimeout(() => process.exit(1), 10000).unref();
}
 
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
