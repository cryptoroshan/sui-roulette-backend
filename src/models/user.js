const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, default: "" },
  wallet_address: { type: String, default: "" },
  balance: { type: String, default: "" },
  socket_id: { type: String, default: "" }
}, { timestamps: true });

module.exports = user = mongoose.model('user', userSchema);
