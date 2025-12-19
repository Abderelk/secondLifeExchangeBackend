import dotenv from 'dotenv';
dotenv.config(); // DOIT être avant tous les autres imports !

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import homeRoutes from './routes/homeRoutes';
import itemRoutes from './routes/itemRoutes';

const app = express();
const PORT = Number(process.env.PORT) || 8080;

/**
 * --------------------
 * MIDDLEWARES
 * --------------------
 */
app.use(
  cors({
    origin: '*', // OK pour test, à restreindre en prod
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * --------------------
 * LOGS (debug Cloud Run)
 * --------------------
 */
app.use((req, _res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

/**
 * --------------------
 * ROUTES
 * --------------------
 */
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

app.get('/api', (_req, res) => {
  res.json({ success: true, message: 'API works!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/items', itemRoutes);

/**
 * --------------------
 * ERROR HANDLER
 * --------------------
 */
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('❌ Erreur serveur:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
);

/**
 * --------------------
 * START SERVER (AVANT DB)
 * --------------------
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

/**
 * --------------------
 * MONGODB ATLAS
 * --------------------
 */
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI non définie');
} else {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('✅ MongoDB Atlas connecté');
    })
    .catch((err) => {
      console.error('❌ Erreur MongoDB:', err.message);
    });
}
