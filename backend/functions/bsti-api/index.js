import { createServer } from './src/app.js';
import { loadConfig } from './src/config.js';

const config = loadConfig();
let databasePool = null;
let submissionService = null;

if (config.submissionEnabled) {
  const [databaseModule, repositoryModule, serviceModule] = await Promise.all([
    import('./src/database.js'),
    import('./src/assessment-repository.js'),
    import('./src/assessment-submission-service.js')
  ]);
  databasePool = await databaseModule.createDatabasePool(config.database);
  const repository = repositoryModule.createAssessmentRepository(databasePool);
  submissionService = serviceModule.createAssessmentSubmissionService(repository);
}

const server = createServer(config, {
  submissionService,
  onUnhandledError() {
    console.error('[bsti-api] unhandled request error');
  }
});

server.on('error', () => {
  console.error('[bsti-api] server startup error');
  process.exitCode = 1;
});

server.on('close', () => {
  if (databasePool) {
    databasePool.end().catch(() => {
      console.error('[bsti-api] database pool shutdown error');
    });
  }
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[bsti-api] listening environment=${config.runtimeEnv} port=${config.port}`);
});
