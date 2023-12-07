const mongoose = require('mongoose');

const tokensSchema = new mongoose.Schema(
  {
    accessToken: {
      type: String,
      default: 'singleton',
      required: true,
    },
    refreshToken: {
      type: String,
      default: 'singleton',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TokensSchema', tokensSchema);
