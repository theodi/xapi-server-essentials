const express = require('express');
const router = express.Router();
const authorityController = require('../controllers/authority');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply the middleware to all routes in this router
router.use(ensureAuthenticated);

// GET the form for adding a new authority (renders the add page)
router.get('/new', authorityController.renderAddAuthorityForm);

// GET all authorities
router.get('/', authorityController.getAllAuthorities);

// GET a specific authority by ID
router.get('/:id', authorityController.getAuthorityById);

// POST create a new authority
router.post('/', authorityController.createAuthority);

// PUT update an existing authority by ID
router.put('/:id', authorityController.updateAuthority);

// DELETE a specific authority by ID
router.delete('/:id', authorityController.deleteAuthority);

module.exports = router;