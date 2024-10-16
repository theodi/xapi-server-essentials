const Client = require('../models/client');
const crypto = require('crypto');

// GET all clients with content negotiation (HTML or JSON)
exports.getAllClients = async (req, res) => {
    try {
        const clients = await Client.find().populate('authority');

        // Content negotiation logic
        if (req.accepts('html')) {
            const page = {
                title: "Clients"
            };
            res.locals.page = page;
            res.render('pages/clients/view');
        } else if (req.accepts('json')) {
            res.status(200).json(clients);
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'An error occurred while fetching clients' });
    }
};

// GET a specific client by ID
exports.getClientById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        if (req.accepts('html')) {
            const page = {
                title: "Edit client"
            };
            res.locals.page = page;
            res.render('pages/clients/new', { clientId: req.params.id });
        } else if (req.accepts('json')) {
            res.status(200).json(client);
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'An error occurred while fetching the client' });
    }
};

// POST create a new client
exports.createClient = async (req, res) => {
    try {
        const { title, authority, origin, key, secret, basicAuth, isDisabled } = req.body;

        // Ensure required fields are present
        if (!title || !authority || !origin) {
            return res.status(400).json({ error: 'Title, Authority, and Origin are required' });
        }

        // Generate key, secret, and basicAuth if not provided
        const generatedKey = key || crypto.randomBytes(16).toString('hex');
        const generatedSecret = secret || crypto.randomBytes(32).toString('hex');
        const generatedBasicAuth = basicAuth || Buffer.from(`${generatedKey}:${generatedSecret}`).toString('base64');

        const newClient = new Client({
            title,
            authority,
            origin,
            key: generatedKey,
            secret: generatedSecret,
            basicAuth: generatedBasicAuth,
            isDisabled: typeof isDisabled !== 'undefined' ? isDisabled : false  // default to false
        });

        const savedClient = await newClient.save();
        res.status(201).json(savedClient);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while creating the client' });
    }
};


// PUT update an existing client
exports.updateClient = async (req, res) => {
    try {
        const { title, authority, key, secret, basicAuth, origin, isDisabled } = req.body;
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Update fields if they are provided in the request, otherwise keep existing values
        client.title = title || client.title;
        client.authority = authority || client.authority;
        client.key = key || client.key;
        client.secret = secret || client.secret;
        client.basicAuth = basicAuth || client.basicAuth;
        client.origin = origin || client.origin;
        client.isDisabled = typeof isDisabled !== 'undefined' ? isDisabled : client.isDisabled;

        // Save the updated client
        const updatedClient = await client.save();
        res.status(200).json(updatedClient);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the client' });
    }
};

// DELETE a specific authority
exports.deleteClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.status(200).json({ message: 'Client successfully deleted' });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting the client' });
    }
};

// GET form for adding a new client (renders the page)
exports.renderAddClientForm = (req, res) => {
    const page = {
        title: "Add client"
    };
    res.locals.page = page;
    res.render('pages/clients/new');
};