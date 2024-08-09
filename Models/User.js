const mongoose = require('mongoose');

// Define User Schema
const userSchema = new mongoose.Schema({
    Fullname: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

// Define Blog Schema
const blogSchema = new mongoose.Schema({
    author: { type: String, required: true }, 
    Title: { type: String, required: true, unique: true },
    Createdon: { type: Date, default: Date.now },
    content: { type: String, required: true }
});

// Create User model
const User = mongoose.model('User', userSchema);

// Create Blog model
const Blog = mongoose.model('Blog', blogSchema);

module.exports = { User, Blog };

