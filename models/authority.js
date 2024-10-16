const mongoose = require('mongoose');

// Schema for authority
const authoritySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        match: [/.+@.+\..+/, 'Please enter a valid email address']
    }
}, {
    timestamps: true
});

// Export the model
module.exports = mongoose.model('Authority', authoritySchema);