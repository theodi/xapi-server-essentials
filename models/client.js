const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Schema for client keys
const clientKeySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    authority: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Authority',
        required: true
    },
    origin: {
        type: String,
        required: true
    },
    key: {
        type: String,
        default: () => uuidv4(),
        required: true,
        unique: true
    },
    secret: {
        type: String,
        default: () => crypto.randomBytes(32).toString('hex'),
        required: true
    },
    basicAuth: {
        type: String,
        default: function() {
            const authString = this.key + ':' + this.secret;
            return Buffer.from(authString).toString('base64');
        },
        required: true
    },
    isDisabled: {
        type: Boolean,
        default: false
    },
    // New field for dashboard activities
    dashboardActivities: {
        type: [String], // Array of strings (URLs)
        validate: {
            validator: function(v) {
                return v.every(url => /^https?:\/\/.*/.test(url)); // Validate if all elements are valid URLs
            },
            message: props => `${props.value} is not a valid URL!`
        },
        default: []
    }
}, {
    timestamps: true
});

// Export the model
module.exports = mongoose.model('Client', clientKeySchema);