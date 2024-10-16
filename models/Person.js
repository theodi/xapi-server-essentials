const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
    display: { type: String, required: true, unique: true },  // This is the actor's name or display identifier
    account: {
        homePage: { type: String, required: false },  // The actor's account homePage
        name: { type: String, required: false }  // The actor's account name (ID)
    }
}, {
    timestamps: true  // Automatically adds createdAt and updatedAt timestamps
});

// Export the Person model
module.exports = mongoose.model('Person', personSchema);