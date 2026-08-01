import { createServer } from './src/app.js';
import { loadConfig } from './src/config.js';

const config = loadConfig();
const server = createServer(config, {
  onUnhandledError() {
    console.error('[bsti-api] unhandled request error');
  }
});

server.on('error', () => {
  console.error('[bsti-api] server startup error');
  process.exitCode = 1;
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[bsti-api] listening environment=${config.runtimeEnv} port=${config.port}`);
});
