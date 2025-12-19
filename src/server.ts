import dotenv from 'dotenv';
dotenv.config(); // DOIT être avant tous les autres imports !

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import homeRoutes from './routes/homeRoutes';
import itemRoutes from './routes/itemRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - Version simplifiée qui fonctionne
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logs pour debug
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/api', (req, res) => {
  res.json({ success: true, message: 'API works!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/items', itemRoutes);
// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erreur:', err);
  res.status(500).json({ success: false, message: 'Erreur serveur' });
});

// Connect DB and start
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secondlifeexchange')
  .then(() => {
    console.log('✅ MongoDB connecté');
    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
      console.log(`📡 CORS: OUVERT À TOUS (dev mode)`);
      console.log('='.repeat(50));
    });
  })
  .catch((err) => {
    console.error('❌ Erreur MongoDB:', err);
    process.exit(1);
  });