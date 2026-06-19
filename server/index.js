import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ── MongoDB Connection ──
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ── Student Result Schema ──
const subjectSchema = new mongoose.Schema({
  name: String,
  credits: Number,
  marks: Number,
  grade: String,
  gradePoints: Number,
  isMinor: { type: Boolean, default: false },
});

const studentResultSchema = new mongoose.Schema({
  studentName: { type: String, required: true, trim: true },
  semesterGroup: { type: String, enum: ['maths', 'os'], required: true },
  subjects: [subjectSchema],
  minors: [subjectSchema],
  cgpa: { type: Number, required: true },
  totalCredits: { type: Number, required: true },
  totalWeightedPoints: { type: Number, required: true },
  hasReappear: { type: Boolean, default: false },
  savedAt: { type: Date, default: Date.now },
});

const StudentResult = mongoose.model('StudentResult', studentResultSchema);

// ── Routes ──

// Save result
app.post('/api/results', async (req, res) => {
  try {
    const result = new StudentResult(req.body);
    const saved = await result.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get all results for a student name
app.get('/api/results/:name', async (req, res) => {
  try {
    const results = await StudentResult.find({
      studentName: { $regex: new RegExp(req.params.name, 'i') }
    }).sort({ savedAt: -1 }).limit(10);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all results
app.get('/api/results', async (req, res) => {
  try {
    const results = await StudentResult.find().sort({ savedAt: -1 }).limit(50);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}
