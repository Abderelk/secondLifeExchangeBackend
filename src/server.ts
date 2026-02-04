// src/server.ts

import dotenv from 'dotenv';
dotenv.config(); // DOIT être avant tous les autres imports !

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { initializeSocket } from './services/socketService';

// Routes
import authRoutes from './routes/authRoutes';
import itemRoutes from './routes/itemRoutes';
import homeRoutes from './routes/homeRoutes';
import exchangeRoutes from './routes/exchangeRoutes';
import messageRoutes from './routes/messageRoutes';
import uploadRoutes from './routes/uploadRoutes'
import suggestionsRoutes from './routes/suggestionsRoutes';
import themeRoutes from './routes/themeRoutes';
import { initCronJobs } from './services/cronService';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialiser Socket.IO
initializeSocket(httpServer);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logs pour debug
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Routes API
app.get('/api', (req, res) => {
  res.json({ success: true, message: 'SecondLife Exchange API v1.0 🌱' });
});

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/exchanges', exchangeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/upload', uploadRoutes
);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Erreur:', err);
  res.status(500).json({ success: false, message: 'Erreur serveur' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvée' });
});

// Connect DB and start
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secondlifeexchange')
  .then(() => {
    console.log('✅ MongoDB connecté');

    // Initialiser les tâches cron pour les notifications de thèmes
    initCronJobs();

    httpServer.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
      console.log(`🔌 WebSocket activé`);
      console.log(`📡 CORS: ${process.env.CORS_ORIGIN || 'OUVERT À TOUS'}`);
      console.log('='.repeat(50));
      console.log('\n📍 Routes disponibles:');
      console.log('   GET  /api                    - Health check');
      console.log('   POST /api/auth/register');
      console.log('   POST /api/auth/login');
      console.log('   PUT  /api/auth/profile       - Update profile');
      console.log('   GET  /api/home               - Données HomePage');
      console.log('   GET  /api/items');
      console.log('   POST /api/items');
      console.log('   POST /api/exchanges          - Proposer un échange');
      console.log('   GET  /api/exchanges          - Mes échanges');
      console.log('   GET  /api/messages/conversations  - Mes conversations');
      console.log('   POST /api/messages/conversations/:id - Envoyer message');
      console.log('   GET  /api/themes/current     - Thème actuel');
      console.log('   GET  /api/themes/calendar    - Calendrier des thèmes');
      console.log('   GET  /api/themes/upcoming    - Prochains thèmes');
      console.log('   🔌  WebSocket events: message:new, conversation:updated');
    });
  })
  .catch((err) => {
    console.error('❌ Erreur MongoDB:', err);
    process.exit(1);
  });