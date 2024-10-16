const express = require('express');
const router = express.Router();
const xAPIController = require('../controllers/xAPI');
const { authClient } = require('../middleware/auth');

// OPTIONS route to handle preflight requests
router.options('/statements', (req, res) => {
    res.setHeader('Allow', 'POST');
    res.status(200).send();
});

// POST route for statements (protected by client authentication middleware)
router.post('/statements', authClient, xAPIController.postStatement);

// POST/PUT routes to store state data (protected by client authentication middleware)
router.post('/activities/state', authClient, xAPIController.storeState);
router.put('/activities/state', authClient, xAPIController.storeState);

// GET route to retrieve state data
router.get('/activities/state', authClient, xAPIController.getState);

module.exports = router;