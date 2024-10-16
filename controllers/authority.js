const Authority = require('../models/authority');

// GET all authorities with content negotiation (HTML or JSON)
exports.getAllAuthorities = async (req, res) => {
    try {
        const authorities = await Authority.find();

        // Content negotiation logic
        if (req.accepts('html')) {
            const page = {
                title: "Authorities"
            };
            res.locals.page = page;
            res.render('pages/authorities/view');
        } else if (req.accepts('json')) {
            res.status(200).json(authorities);
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'An error occurred while fetching authorities' });
    }
};

// GET a specific authority by ID
exports.getAuthorityById = async (req, res) => {
    try {
        const authority = await Authority.findById(req.params.id);

        if (!authority) {
            return res.status(404).json({ error: 'Authority not found' });
        }

        if (req.accepts('html')) {
            const page = {
                title: "Edit authority"
            };
            res.locals.page = page;
            res.render('pages/authorities/new', { authorityId: req.params.id });
        } else if (req.accepts('json')) {
            res.status(200).json(authority);
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'An error occurred while fetching the authority' });
    }
};

// POST create a new authority
exports.createAuthority = async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const newAuthority = new Authority({
            name,
            email
        });

        const savedAuthority = await newAuthority.save();
        res.status(201).json(savedAuthority);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while creating the authority' });
    }
};

// PUT update an existing authority
exports.updateAuthority = async (req, res) => {
    try {
        const { name, email } = req.body;
        const authority = await Authority.findById(req.params.id);

        if (!authority) {
            return res.status(404).json({ error: 'Authority not found' });
        }

        authority.name = name || authority.name;
        authority.email = email || authority.email;

        const updatedAuthority = await authority.save();
        res.status(200).json(updatedAuthority);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the authority' });
    }
};

// GET form for adding a new authority (renders the page)
exports.renderAddAuthorityForm = (req, res) => {
    const page = {
        title: "Add authority"
    };
    res.locals.page = page;
    res.render('pages/authorities/new');
};

// DELETE a specific authority
exports.deleteAuthority = async (req, res) => {
    try {
        const authority = await Authority.findByIdAndDelete(req.params.id);

        if (!authority) {
            return res.status(404).json({ error: 'Authority not found' });
        }

        res.status(200).json({ message: 'Authority successfully deleted' });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting the authority' });
    }
};
