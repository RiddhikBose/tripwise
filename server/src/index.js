import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './db.js';

const port = Number(process.env.PORT) || 4000;

try {
  await connectDb();
} catch (err) {
  console.error('Could not connect to MongoDB:', err.message);
  process.exit(1);
}

createApp().listen(port, () => {
  console.log(`TripWise API listening on http://localhost:${port}`);
});
