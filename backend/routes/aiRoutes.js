// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const jwtMiddleware = require('../middleware/jwtMiddleware'); // Use the new middleware file

// Apply the new middleware to routes
router.get('/insights', jwtMiddleware, aiController.generateInsights);
router.post('/deals', jwtMiddleware, aiController.findDeals);

module.exports = router;