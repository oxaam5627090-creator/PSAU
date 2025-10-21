import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import { config } from './config.js';
import { migrate } from './db.js';
import { ensureUploadsDir } from './cronDelete.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(config.uploadsDir));
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.uploadLimitMb * 1024 * 1024 },
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/uploads', uploadRoutes(upload));
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await ensureUploadsDir();
  await migrate();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
