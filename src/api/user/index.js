const express = require('express');
const router = express.Router();
const auth = require("./controller");

router.get('/get_user_info', auth.getUserInfo);

module.exports = router;
