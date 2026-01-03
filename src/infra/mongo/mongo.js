const mongoose = require('mongoose');
const env = require('../../config/env');

const connectMongo = async () => {
  try {
    if (!env.mongo.uri) return; // Skip if not configured
    await mongoose.connect(env.mongo.uri);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    throw err;
  }
};

module.exports = {
  connectMongo,
};
