const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
    activityId: { type: String, required: true },
    agent: {
        objectType: { type: String, required: true },
        name: { type: String, required: true },
        account: {
            homePage: { type: String, required: true },
            name: { type: String, required: true }
        }
    },
    stateId: { type: String, required: true },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
    createdDate: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now }
});

// Update lastUpdated every time the document is modified
stateSchema.pre('save', function (next) {
    this.lastUpdated = Date.now();
    next();
});

// Compound index on activityId, agent, and stateId for efficient lookups
stateSchema.index({ activityId: 1, 'agent.name': 1, 'agent.account.name': 1, stateId: 1 });

module.exports = mongoose.model('State', stateSchema);
