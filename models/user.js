const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	authId: String,
	name: String,
	email: String,
	role: String,
	created: Date,
	ip: String
});

const User = mongoose.model('User', userSchema);
module.exports = User;