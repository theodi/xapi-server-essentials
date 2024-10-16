const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply the middleware to all routes in this router
router.use(ensureAuthenticated);

// GET the form for adding a new client (renders the add page)
router.get('/new', clientController.renderAddClientForm);

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