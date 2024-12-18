const Statement = require('../models/Statement');
const Person = require('../models/Person');
const State = require('../models/State');
const locks = {};

// POST a new statement
exports.postStatement = async (req, res) => {
    try {
        // Extract client information from the authenticated request
        const clientId = req.client._id; // The authenticated client ID
        const clientAuthority = { ...req.client.authority.toObject() }; // Clone the authority object

        // Manipulate clientAuthority as needed
        clientAuthority.mbox = clientAuthority.email;
        delete clientAuthority.email;
        clientAuthority.objectType = "Agent";

        // Validate the structure of the incoming statement
        const { actor, verb, object, result, context, stored } = req.body;
        if (!actor || !verb || !object) {
            return res.status(400).json({ error: 'Invalid statement structure: actor, verb, and object are required' });
        }

        // Use the stored date from the request if it exists, otherwise generate a new one
        const storedDate = stored ? new Date(stored) : new Date();
        const activities = [object.id];
        const agents = [`${actor.account.homePage}|${actor.account.name}`];
        const verbs = [verb.id];
        const personDisplay = actor.name;

        // Extract relatedActivities from contextActivities.grouping (if present)
        let relatedActivities = [object.id];  // Start with the main object ID
        if (context && context.contextActivities && context.contextActivities.grouping) {
            relatedActivities = relatedActivities.concat(
                context.contextActivities.grouping.map(activity => activity.id)
            );
        }

        // Check if person exists, otherwise create a new person record
        let person = await Person.findOne({ display: personDisplay });
        if (!person) {
            try {
                person = new Person({ display: personDisplay });
                await person.save();
            } catch (err) {
                console.error('Error saving person:', err);
            }
        }

        // Construct the statement object for saving
        const newStatement = new Statement({
            stored: storedDate,
            client: clientId,
            activities,
            agents,
            statement: {
                actor: req.body.actor,
                verb: req.body.verb,
                object: req.body.object,
                result: req.body.result || { completion: false },
                context: req.body.context || {},  // Add context to the statement
                id: req.body.id,
                stored: storedDate,
                timestamp: storedDate,
                authority: clientAuthority,  // The modified authority
                version: "1.0.0"
            },
            verbs,
            person: {
                _id: person._id,
                display: person.display
            },
            timestamp: storedDate,
            relatedActivities,
            relatedAgents: agents.concat([clientAuthority.mbox]),
            organisation: clientAuthority._id // Organisation ID from the clien
        });

        // Save the statement to the database
        await newStatement.save();

        res.status(201).json({ message: 'Statement saved successfully', id: newStatement._id });
    } catch (error) {
        console.error('Error processing xAPI statement:', error);
        res.status(500).json({ error: 'An error occurred while processing the xAPI statement' });
    }
};

// Helper function to generate a unique lock key
function getLockKey(activityId, agent, stateId) {
    return `${activityId}-${agent}-${stateId}`;
}

// POST/PUT a new or updated state
exports.storeState = async (req, res) => {
    const { activityId, agent, stateId, lastModified } = req.query;

    // Validate the query parameters
    if (!activityId || !agent || !stateId || !req.body) {
        return res.status(400).json({ error: 'Missing required parameters or invalid body' });
    }

    // Parse the agent query parameter
    const parsedAgent = JSON.parse(agent);
    const lockKey = getLockKey(activityId, agent, stateId);

    // Acquire lock to handle concurrent requests
    await acquireLock(lockKey);

    try {
        // Get the state data (can be any type)
        const state = req.body;

        // Determine the date to use for createdDate and lastUpdated
        const timestamp = lastModified ? new Date(lastModified) : Date.now();

        // Find existing state by activityId, agent, and stateId
        let stateRecord = await State.findOne({ activityId, agent: parsedAgent, stateId });

        if (stateRecord) {
            // Overwrite the state and update the metadata
            stateRecord.state = state;
            stateRecord.lastUpdated = timestamp;
        } else {
            // Create a new state record
            stateRecord = new State({
                activityId,
                agent: parsedAgent,
                stateId,
                state,  // Store the state directly
                clientId: req.client._id,
                organisationId: req.client.authority._id,
                createdDate: timestamp,
                lastUpdated: timestamp
            });
        }

        // Save the record to the database
        await stateRecord.save();

        // Return 204 No Content
        res.status(204).send();
    } catch (error) {
        console.error('Error storing state:', error);
        res.status(500).json({ error: 'An error occurred while storing the state' });
    } finally {
        // Release the lock
        releaseLock(lockKey);
    }
};

// Acquire lock
function acquireLock(key) {
    return new Promise((resolve) => {
        const tryAcquire = () => {
            if (!locks[key]) {
                locks[key] = true;  // Lock is acquired
                resolve();
            } else {
                // If lock is held, retry after a short delay
                setTimeout(tryAcquire, 100);
            }
        };

        tryAcquire();
    });
}

// Release lock
function releaseLock(key) {
    delete locks[key];
}

// GET the state for a specific activity, agent, and stateId
exports.getState = async (req, res) => {
    const { activityId, agent, stateId } = req.query;

    // Validate the query parameters
    if (!activityId || !agent || !stateId) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }

    // Parse the agent query parameter
    const parsedAgent = JSON.parse(agent);

    // Find the state by activityId, agent, and stateId
    const stateRecord = await State.findOne({ activityId, agent: parsedAgent, stateId });

    if (!stateRecord) {
        return res.status(404).json({ error: 'State not found' });
    }

    // Return the stored state (could be any type: object, array, etc.)
    res.status(200).json(stateRecord.state);
};

