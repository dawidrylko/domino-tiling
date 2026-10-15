const { isMainThread } = require('worker_threads');

if (!isMainThread) {
  process.exit(3);
}
