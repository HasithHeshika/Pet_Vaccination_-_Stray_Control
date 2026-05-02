const express = require('express');
const router = express.Router();
const BreederLicense = require('../models/breederLicense.model');
const { verifyRole } = require('../middleware/authMiddleware');

// CREATE application
router.post('/', async (req, res) => {
    try {
        const appData = new BreederLicense(req.body);
        await appData.save();
        res.status(201).json(appData);
    } catch {
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// APPROVE / REJECT
router.put('/:id', verifyRole(['admin', 'authority']), async (req, res) => {
    try {
        const updated = await BreederLicense.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updated);
    } catch {
        res.status(500).json({ error: 'Update failed' });
    }
});

// COMPLIANCE UPDATE
router.patch('/:id/compliance', verifyRole(['admin', 'authority']), async (req, res) => {
    try {
        const updated = await BreederLicense.findByIdAndUpdate(
            req.params.id,
            { isCompliant: req.body.isCompliant },
            { new: true }
        );
        res.json(updated);
    } catch {
        res.status(500).json({ error: 'Compliance update failed' });
    }
});

module.exports = router;
