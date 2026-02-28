import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/medicine/upload-excel
router.post('/upload-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const medicines = xlsx.utils.sheet_to_json(sheet);
    // Save medicines to DB (mock: write to a file or in-memory array)
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, '../../data/medicines.json');
    let db = [];
    if (fs.existsSync(dbPath)) {
      try {
        db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      } catch {}
    }
    medicines.forEach((med) => {
      db.push({ ...med, id: 'M-' + (db.length + 1).toString().padStart(3, '0') });
    });
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return res.json({ success: true, count: medicines.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process file' });
  }
});

export default router;
