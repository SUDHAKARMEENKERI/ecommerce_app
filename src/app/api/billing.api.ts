import express from 'express';

const router = express.Router();

// In-memory store for demo
const billings: any[] = [];

// POST /billing - Create a new billing
router.post('/billing', (req, res) => {
  const billing = req.body;
  billings.push(billing);
  res.status(201).json({ message: 'Billing created', billing });
});

// GET /billing - Get billings with optional filters
router.get('/billing', (req, res) => {
  const { storeId, storeMobile, email } = req.query;
  let filtered = billings;
  if (storeId) filtered = filtered.filter(b => b.storeId === storeId);
  if (storeMobile) filtered = filtered.filter(b => b.storeMobile === storeMobile);
  if (email) filtered = filtered.filter(b => b.email === email);
  res.json(filtered);
});

export default router;
