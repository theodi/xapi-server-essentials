const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply the middleware to all routes in this router
router.use(ensureAuthenticated);

// GET the form for adding a new client (renders the add page)
router.get('/new', clientController.renderAddClientForm);

// Route to get the count of statements for a specific client
router.get('/:id/statements/count', clientController.getClientStatementCount);

// Route for client summary
router.get('/:id/overall-summary', clientController.getOverallSummary);

// Route for activity summary
router.get('/:id/activity-summary', clientController.getActivitySummary);

router.get('/:id/monthly-verb-summary-all', clientController.getMonthlyVerbSummaryAllActivities);

// Route for monthly verb summary
router.get('/:id/monthly-verb-summary', clientController.getMonthlyVerbSummary);

router.get('/:id/actor-progression-summary', clientController.getActorProgressionSummary);

// Route to render the client dashboard (HTML)
router.get('/:id/dashboard', (req, res) => {
    const clientId = req.params.id;
    const page = {
        title: "Client Dashboard"
    };
    res.locals.page = page;
    res.render('pages/clients/dashboard', { clientId }); // Pass only clientId to the EJS page
});

// GET all clients
router.get('/', clientController.getAllClients);

// GET a specific client by ID
router.get('/:id', clientController.getClientById);

// POST create a new client
router.post('/', clientController.createClient);

// PUT update an existing client by ID
router.put('/:id', clientController.updateClient);

// DELETE a specific client by ID
router.delete('/:id', clientController.deleteClient);

module.exports = router;