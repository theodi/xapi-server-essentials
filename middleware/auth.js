const Authority = require('../models/authority');
const Client = require('../models/client');
const atob = require('atob');  // To decode base64

// Middleware to authenticate client using Basic Auth
async function authClient(req, res, next) {
    try {
        // Check if the Authorization header is provided
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }

        // Decode the Basic Auth header
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = atob(base64Credentials).split(':');
        const apiKey = credentials[0];
        const apiSecret = credentials[1];

        if (!apiKey || !apiSecret) {
            return res.status(401).json({ error: 'Invalid API credentials' });
        }

        // Check if the client exists with the given key and secret
        const client = await Client.findOne({ key: apiKey, secret: apiSecret }).populate('authority');

        if (!client) {
            return res.status(401).json({ error: 'Invalid API credentials' });
        }

        // Check if the Origin header matches the client's origin
        const requestOrigin = req.headers.origin;
        if (requestOrigin !== client.origin) {
            return res.status(403).json({ error: 'Origin not allowed' });
        }

        // Attach the client to the request object for further use
        req.client = {
            _id: client._id,
            authority: client.authority
        };

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Error in authClient middleware:', error);
        res.status(500).json({ error: 'An error occurred while authenticating the client' });
    }
}

// Middleware to ensure user authentication via session (for different routes)
async function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        const error = new Error("Unauthorized");
        error.status = 401;
        next(error);
    }
}

// Export both functions from the module
module.exports = {
    authClient,
    ensureAuthenticated
};