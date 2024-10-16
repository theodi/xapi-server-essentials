const mongoose = require('mongoose');

const statementSchema = new mongoose.Schema({
    stored: { type: Date, default: Date.now },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    activities: [{ type: String, required: true }],  // Main object IDs
    agents: [{ type: String, required: true }],
    statement: {
        authority: {
            objectType: { type: String, required: true },
            name: { type: String, required: true },
            mbox: { type: String, required: true }
        },
        stored: { type: Date, default: Date.now },
        actor: {
            objectType: { type: String, required: true },
            name: { type: String, required: true },
            account: {
                homePage: { type: String, required: true },
                name: { type: String, required: true }
            }
        },
        timestamp: { type: Date, default: Date.now },
        version: { type: String, default: '1.0.0' },
        id: { type: String, required: true },
        result: {
            completion: { type: Boolean },
            duration: { type: String }  // Duration may be present in some statements
        },
        verb: {
            id: { type: String, required: true },
            display: {
                'en-US': { type: String, required: true }
            }
        },
        object: {
            objectType: { type: String, required: true },
            id: { type: String, required: true },
            definition: {
                type: { type: String, required: true },
                name: { 'en': { type: String, required: true } },
                description: { 'en': { type: String, default: '' } }
            }
        },
        context: {
            contextActivities: {
                grouping: [
                    {
                        objectType: { type: String, required: true },
                        id: { type: String, required: true },
                        definition: {
                            type: { type: String, required: true },
                            name: { 'en': { type: String, required: true } },
                            description: { 'en': { type: String, default: '' } }
                        }
                    }
                ]
            }
        }
    },
    verbs: [{ type: String, required: true }],
    person: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
        display: { type: String, required: true }
    },
    timestamp: { type: Date, default: Date.now },
    relatedActivities: [{ type: String, required: true }],  // Extracted IDs from both object and contextActivities.grouping
    relatedAgents: [{ type: String, required: true }],
    organisation: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Statement', statementSchema);