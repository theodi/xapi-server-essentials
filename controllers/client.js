const Client = require('../models/client');
const crypto = require('crypto');
const Statement = require('../models/Statement');
const mongoose = require('mongoose');

// Helper function to check if a string is URL-encoded
const isEncoded = (str) => {
    try {
        return str !== decodeURIComponent(str);
    } catch (e) {
        return false;
    }
};

// GET an overall summary across all dashboard activities for a client
exports.getOverallSummary = async (req, res) => {
    try {
        const clientId = req.params.id;
        const clientObjectId = new mongoose.Types.ObjectId(clientId);

        // Fetch the client to retrieve the dashboardActivities
        const client = await Client.findById(clientObjectId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Extract URIs from dashboardActivities
        const activityURIs = client.dashboardActivities
            .map(activity => activity.uri)
            .filter(uri => typeof uri === 'string'); // Ensure only valid URIs are included

        if (activityURIs.length === 0) {
            return res.status(400).json({ error: 'No valid dashboard activities configured for this client' });
        }


        // Aggregate statements matching any of the dashboardActivities
        const overallSummary = await Statement.aggregate([
            {
                $match: {
                    client: clientObjectId,
                    activities: { $in: activityURIs }
                }
            },
            // Unwind verbs to handle cases with multiple verbs per statement
            {
                $unwind: "$verbs"
            },
            // Filter for specific verbs of interest
            {
                $match: {
                    verbs: {
                        $in: [
                            "http://adlnet.gov/expapi/verbs/launched",
                            "http://adlnet.gov/expapi/verbs/attempted",
                            "http://adlnet.gov/expapi/verbs/passed",
                            "http://adlnet.gov/expapi/verbs/failed",
                            "http://adlnet.gov/expapi/verbs/completed"
                        ]
                    }
                }
            },
            // Group by verb, person, and activity to get only the first occurrence
            {
                $group: {
                    _id: { verb: "$verbs", person: "$person.display", activity: "$activities" },
                    count: { $sum: 1 }
                }
            },
            // Group by verb to get the count of unique verb+person+activity occurrences
            {
                $group: {
                    _id: "$_id.verb",
                    uniqueCount: { $sum: 1 }
                }
            }
        ]);

        // Format the result for readability
        const formattedSummary = overallSummary.map(item => ({
            verb: item._id,
            count: item.uniqueCount
        }));

        res.status(200).json(formattedSummary);
    } catch (error) {
        console.error('Error generating overall summary:', error);
        res.status(500).json({ error: 'An error occurred while generating the overall summary' });
    }
};

// GET an activity summary for a given activity
exports.getActivitySummary = async (req, res) => {
    try {
        const clientId = req.params.id;
        let activityId = req.query.activity; // Expecting activity URL to be passed as a query parameter
        const clientObjectId = new mongoose.Types.ObjectId(clientId);

        if (!activityId) {
            return res.status(400).json({ error: 'Activity ID is required' });
        }

        // Check if the activityId is encoded, and decode it if necessary
        if (isEncoded(activityId)) {
            activityId = decodeURIComponent(activityId);
        }

        // Ensure that the activity summary is restricted to the client's data
        const activitySummary = await Statement.aggregate([
            // Match statements for the given client and activity
            {
                $match: {
                    client: clientObjectId,
                    activities: activityId
                }
            },
            // Filter for specific verbs
            {
                $match: {
                    verbs: {
                        $in: [
                            "http://adlnet.gov/expapi/verbs/launched",
                            "http://adlnet.gov/expapi/verbs/attempted",
                            "http://adlnet.gov/expapi/verbs/passed",
                            "http://adlnet.gov/expapi/verbs/failed",
                            "http://adlnet.gov/expapi/verbs/completed"
                        ]
                    }
                }
            },
            // Group by verb and person, ensuring unique combinations of verb and person
            {
                $group: {
                    _id: { verb: "$verbs", person: "$person.display" },  // Group by verb and person
                    count: { $sum: 1 }
                }
            },
            // Group again by verb to get the count of unique people per verb
            {
                $group: {
                    _id: "$_id.verb",  // Group by verb
                    uniquePersonCount: { $sum: 1 } // Count unique persons per verb
                }
            }
        ]);

        // Format the result in a readable form
        const formattedSummary = activitySummary.map(item => ({
            verb: item._id[0],  // Since verbs is an array, get the first element
            count: item.uniquePersonCount
        }));

        res.status(200).json(formattedSummary);
    } catch (error) {
        console.error('Error generating activity summary:', error);
        res.status(500).json({ error: 'An error occurred while generating the activity summary' });
    }
};

// GET year+month breakdown of verbs for all dashboard activities of a client
exports.getMonthlyVerbSummaryAllActivities = async (req, res) => {
    try {
        const clientId = req.params.id;
        const clientObjectId = new mongoose.Types.ObjectId(clientId);

        // Validate the client exists and fetch dashboardActivities
        const client = await Client.findById(clientObjectId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Extract URIs from dashboardActivities
        const activityURIs = client.dashboardActivities
            .map(activity => activity.uri)
            .filter(uri => typeof uri === 'string'); // Ensure only valid URIs are included

        if (activityURIs.length === 0) {
            return res.status(400).json({ error: 'No valid dashboard activities configured for this client' });
        }
        // Aggregate statements by YYYY-MM format for the stored date and group by verbs
        const monthlyVerbSummary = await Statement.aggregate([
            // Match statements for the specific client and dashboard activities
            {
                $match: {
                    client: clientObjectId,
                    activities: { $in: activityURIs }
                }
            },
            // Project necessary fields and format the date as YYYY-MM
            {
                $project: {
                    yearMonth: { $dateToString: { format: "%Y-%m", date: "$stored" } },
                    verbs: "$verbs",
                    person: "$person.display",
                    activity: "$activities",
                    stored: 1  // Keep the stored date for sorting
                }
            },
            // Unwind verbs to handle cases with multiple verbs per statement
            {
                $unwind: "$verbs"
            },
            // Filter for specific verbs
            {
                $match: {
                    verbs: {
                        $in: [
                            "http://adlnet.gov/expapi/verbs/launched",
                            "http://adlnet.gov/expapi/verbs/attempted",
                            "http://adlnet.gov/expapi/verbs/passed",
                            "http://adlnet.gov/expapi/verbs/failed",
                            "http://adlnet.gov/expapi/verbs/completed"
                        ]
                    }
                }
            },
            // Sort by person, verb, activity, and stored date to get the earliest occurrence for each
            {
                $sort: {
                    person: 1,
                    verbs: 1,
                    activity: 1,
                    stored: 1
                }
            },
            // Group by person, verb, and activity to get only the first occurrence of each verb per person per activity
            {
                $group: {
                    _id: { person: "$person", verb: "$verbs", activity: "$activity" },
                    firstOccurrence: { $first: "$yearMonth" }  // Capture the first occurrence's month
                }
            },
            // Group by yearMonth and verb to count unique first occurrences
            {
                $group: {
                    _id: { yearMonth: "$firstOccurrence", verb: "$_id.verb" },
                    uniqueInteractions: { $sum: 1 }
                }
            },
            // Sort by yearMonth in ascending order
            {
                $sort: { "_id.yearMonth": 1 }
            }
        ]);

        // Format the result for readability
        const formattedSummary = monthlyVerbSummary.map(item => ({
            yearMonth: item._id.yearMonth,
            verb: item._id.verb,
            uniqueInteractions: item.uniqueInteractions
        }));

        res.status(200).json(formattedSummary);
    } catch (error) {
        console.error('Error generating monthly verb summary for all activities:', error);
        res.status(500).json({ error: 'An error occurred while generating the monthly verb summary' });
    }
};

// GET year+month breakdown of verbs for a specific client
exports.getMonthlyVerbSummary = async (req, res) => {
    try {
        const clientId = req.params.id;
        let activityId = req.query.activity; // Expecting activity URL to be passed as a query parameter
        const clientObjectId = new mongoose.Types.ObjectId(clientId);

        if (!activityId) {
            return res.status(400).json({ error: 'Activity ID is required' });
        }

        // Check if the activityId is encoded, and decode it if necessary
        if (isEncoded(activityId)) {
            activityId = decodeURIComponent(activityId);
        }

        // Validate the client exists
        const client = await Client.findById(clientObjectId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Aggregate statements by YYYY-MM format for the stored date and group by verbs
        const monthlyVerbSummary = await Statement.aggregate([
            // Match statements for the specific client
            {
                $match: {
                    client: clientObjectId,
                    activities: activityId
                }
            },
            // Project necessary fields and format the date as YYYY-MM
            {
                $project: {
                    yearMonth: { $dateToString: { format: "%Y-%m", date: "$stored" } },
                    verbs: "$verbs",
                    person: "$person.display",
                    stored: 1  // Keep the stored date for sorting
                }
            },
            // Unwind verbs to handle cases with multiple verbs per statement
            {
                $unwind: "$verbs"
            },
            // Filter for specific verbs
            {
                $match: {
                    verbs: {
                        $in: [
                            "http://adlnet.gov/expapi/verbs/launched",
                            "http://adlnet.gov/expapi/verbs/attempted",
                            "http://adlnet.gov/expapi/verbs/passed",
                            "http://adlnet.gov/expapi/verbs/failed",
                            "http://adlnet.gov/expapi/verbs/completed"
                        ]
                    }
                }
            },
            // Sort by person, verb, and stored date to get the earliest occurrence for each
            {
                $sort: {
                    person: 1,
                    verbs: 1,
                    stored: 1
                }
            },
            // Group by person and verb to get only the first occurrence of each verb per person
            {
                $group: {
                    _id: { person: "$person", verb: "$verbs" },
                    firstOccurrence: { $first: "$yearMonth" }  // Capture the first occurrence's month
                }
            },
            // Group by yearMonth and verb to count unique first occurrences
            {
                $group: {
                    _id: { yearMonth: "$firstOccurrence", verb: "$_id.verb" },
                    uniqueInteractions: { $sum: 1 }
                }
            },
            // Sort by yearMonth in ascending order
            {
                $sort: { "_id.yearMonth": 1 }
            }
        ]);

        // Format the result for readability
        const formattedSummary = monthlyVerbSummary.map(item => ({
            yearMonth: item._id.yearMonth,
            verb: item._id.verb,
            uniqueInteractions: item.uniqueInteractions
        }));

        res.status(200).json(formattedSummary);
    } catch (error) {
        console.error('Error generating monthly verb summary:', error);
        res.status(500).json({ error: 'An error occurred while generating the monthly verb summary' });
    }
};

// GET the progression count of unique actors by number of activities they have interacted with for each verb
exports.getActorProgressionSummary = async (req, res) => {
    try {
        const clientId = req.params.id;
        const clientObjectId = new mongoose.Types.ObjectId(clientId);

        // Validate the client exists
        const client = await Client.findById(clientObjectId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Extract URIs from dashboardActivities
        const activityURIs = client.dashboardActivities
            .map(activity => activity.uri)
            .filter(uri => typeof uri === 'string'); // Ensure only valid URIs are included

        if (activityURIs.length === 0) {
            return res.status(400).json({ error: 'No valid dashboard activities configured for this client' });
        }

        // Verbs to analyze
        const verbs = [
            "http://adlnet.gov/expapi/verbs/launched",
            "http://adlnet.gov/expapi/verbs/attempted",
            "http://adlnet.gov/expapi/verbs/passed",
            "http://adlnet.gov/expapi/verbs/failed",
            "http://adlnet.gov/expapi/verbs/completed"
        ];

        // Helper function to get the progression summary for a specific verb
        const getProgressionForVerb = async (verb) => {
            return await Statement.aggregate([
                // Match statements for the specific client, dashboard activities, and specified verb
                {
                    $match: {
                        client: clientObjectId,
                        activities: { $in: activityURIs },
                        verbs: verb
                    }
                },
                // Group by actor and activity to get unique actor-activity combinations
                {
                    $group: {
                        _id: { person: "$person.display", activity: "$activities" },
                    }
                },
                // Group by actor to count the number of unique activities they have interacted with
                {
                    $group: {
                        _id: "$_id.person",
                        activityCount: { $sum: 1 }
                    }
                },
                // Group by activityCount to get the number of actors who have exactly x activities
                {
                    $group: {
                        _id: "$activityCount",
                        actorCount: { $sum: 1 }
                    }
                },
                // Sort by activity count in ascending order
                {
                    $sort: { "_id": 1 }
                }
            ]);
        };

        // Run the queries for each verb in parallel
        const progressionResults = await Promise.all(verbs.map(async (verb) => {
            const result = await getProgressionForVerb(verb);
            return {
                verb,
                progression: result.map(item => ({
                    activities: item._id,
                    actors: item.actorCount
                }))
            };
        }));

        // Format the result to send a readable response
        const formattedSummary = progressionResults.map(result => ({
            verb: result.verb,
            progression: result.progression
        }));

        res.status(200).json(formattedSummary);
    } catch (error) {
        console.error('Error generating actor progression summary:', error);
        res.status(500).json({ error: 'An error occurred while generating the actor progression summary' });
    }
};

// GET the count of statements for a specific client
exports.getClientStatementCount = async (req, res) => {
    try {
        const clientId = req.params.id;

        // Check if the client exists
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Count the number of statements for the client
        const statementCount = await Statement.countDocuments({ client: clientId });

        // Return the count in JSON format
        res.status(200).json({ clientId, statementCount });
    } catch (error) {
        console.error('Error fetching statement count for client:', error);
        res.status(500).json({ error: 'An error occurred while fetching the statement count' });
    }
};

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
        const { title, authority, origin, key, secret, basicAuth, isDisabled, dashboardActivities } = req.body;

        // Ensure required fields are present
        if (!title || !authority || !origin) {
            return res.status(400).json({ error: 'Title, Authority, and Origin are required' });
        }

        // Generate key, secret, and basicAuth if not provided
        const generatedKey = key || crypto.randomBytes(16).toString('hex');
        const generatedSecret = secret || crypto.randomBytes(32).toString('hex');
        const generatedBasicAuth = basicAuth || Buffer.from(`${generatedKey}:${generatedSecret}`).toString('base64');

        // Ensure dashboardActivities is an array if provided
        const validatedDashboardActivities = Array.isArray(dashboardActivities) ? dashboardActivities : [];

        const newClient = new Client({
            title,
            authority,
            origin,
            key: generatedKey,
            secret: generatedSecret,
            basicAuth: generatedBasicAuth,
            isDisabled: typeof isDisabled !== 'undefined' ? isDisabled : false,  // default to false
            dashboardActivities: validatedDashboardActivities // Add the dashboardActivities array
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
        const { title, authority, key, secret, basicAuth, origin, isDisabled, dashboardActivities } = req.body;
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

        // Update dashboardActivities if provided
        if (Array.isArray(dashboardActivities)) {
            client.dashboardActivities = dashboardActivities;
        }

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