import 'dotenv/config';
import app from './app.js';
import { initDB } from './config/initDB.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await initDB();
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
};

startServer();
