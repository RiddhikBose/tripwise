import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const here = path.dirname(fileURLToPath(import.meta.url));

// If no MONGODB_URI is set (local dev), spin up a real mongod binary through
// mongodb-memory-server. Pointing it at server/.data means the data is still
// there after a restart, which is the whole point of the itinerary.
async function localUri() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = path.join(here, '..', '.data');
  fs.mkdirSync(dbPath, { recursive: true });
  const server = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: 'wiredTiger', dbName: 'tripwise' },
  });

  // otherwise mongod outlives node (e.g. on `node --watch` restarts) and
  // keeps the lock on .data
  const shutdown = async () => {
    await mongoose.disconnect().catch(() => {});
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return server.getUri('tripwise');
}

export async function connectDb() {
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI is not set');
    }
    console.log('MONGODB_URI not set, starting a local MongoDB in server/.data');
    uri = await localUri();
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connected (${mongoose.connection.name})`);
}
