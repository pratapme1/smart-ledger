// routes/digest.js
const express = require('express');
const router = express.Router();
const WeeklyDigest = require('../models/WeeklyDigest');
const auth = require('../middleware/auth');
const { generateDigestForUser } = require('../cron/weeklyDigest');

// Get weekly digests
router.get('/', auth, async (req, res) => {
  console.log('Digest requested for user:', req.user?._id);
  try {
    const userId = req.user._id;
    const { limit = 5 } = req.query;
    
    const digests = await WeeklyDigest.find({ userId })
      .sort({ weekEndDate: -1 })
      .limit(parseInt(limit));
      console.log('Found digests:', digests.length);
    
    res.json(digests);
  } catch (error) {
    console.error('Error fetching weekly digests:', error);
    res.status(500).json({
      message: 'Failed to fetch weekly digests',
      error: error.message
    });
  }
});

// Get a specific digest
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    
    const digest = await WeeklyDigest.findOne({
      _id: id,
      userId
    });
    
    if (!digest) {
      return res.status(404).json({ message: 'Digest not found' });
    }
    
    res.json(digest);
  } catch (error) {
    console.error('Error fetching digest:', error);
    res.status(500).json({
      message: 'Failed to fetch digest',
      error: error.message
    });
  }
});

// Generate a new digest
router.post('/generate', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Generating digest for user:', userId);
    
    const digest = await generateDigestForUser(userId);
    
    if (!digest) {
      return res.status(404).json({
        message: 'No data available for digest generation'
      });
    }
    
    res.json(digest);
  } catch (error) {
    console.error('Error generating digest:', error);
    res.status(500).json({
      message: 'Failed to generate digest',
      error: error.message
    });
  }
});

module.exports = router;