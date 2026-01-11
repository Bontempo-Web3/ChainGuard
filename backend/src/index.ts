import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { sessionConfig } from './config/github';
import authRoutes from './routes/auth';
import reposRoutes from './routes/repos';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  })
);

app.use(express.json());
app.use(session(sessionConfig));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ChainGuard Backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/repos', reposRoutes);

app.listen(PORT, () => {
  console.log(`ChainGuard Backend running on http://localhost:${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
});
