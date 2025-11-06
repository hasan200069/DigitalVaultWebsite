import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authRoutes } from './auth-service';
import { vaultRoutes } from './vault-service';
import { inheritanceRouter } from './inheritance-service';
import { auditRoutes } from './audit-service';
import { notificationRoutes } from './notification-service';
import { ocrRoutes } from './ocr-service';
import { folderRoutes } from './folder-service';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Digital Vault API is running!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Authentication routes
app.use('/auth', authRoutes);


// Vault routes
app.use('/vault', vaultRoutes);

// Inheritance routes
app.use('/inheritance', inheritanceRouter);

// Audit routes
app.use('/audit', auditRoutes);

// Notification routes
app.use('/notifications', notificationRoutes);

// OCR routes
app.use('/ocr', ocrRoutes);

// Folder routes
app.use('/folders', folderRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
