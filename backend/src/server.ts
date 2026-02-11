import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './auth/routes';
import manageRoutes from './manage/routes';
import datasetRoutes from './datasets/routes';
import alertRoutes from './alerts/routes';
import notesRoutes from './notes/routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/api', manageRoutes);
app.use('/api', datasetRoutes);
app.use('/api', alertRoutes);
app.use('/api', notesRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
