const express = require('express');
const router = express.Router();
const auth = require("./controller");

router.get('/get_user_info', auth.getUserInfo);

router.post('/create_account', auth.createAccount);

module.exports = router;
