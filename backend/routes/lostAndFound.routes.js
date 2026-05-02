const express = require('express');
const router = express.Router();
const LostAndFound = require('../models/lostAndFound.model');

// CREATE report
router.post('/', async (req, res) => {
    try {
        const newReport = new LostAndFound(req.body);
        await newReport.save();
        res.status(201).json(newReport);
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// GET all reports
router.get('/', async (req, res) => {
    try {
        const reports = await LostAndFound.find();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

module.exports = router;
