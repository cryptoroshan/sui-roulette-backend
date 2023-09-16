const User = require('../../models/user')

exports.getUserInfo = async (req_, res_) => {
  try {
    if (!req_.query.wallet_address)
      return res_.send({ result: false, error: 'Invalid get data!' });

    const _walletAddress = req_.query.wallet_address;
    console.log(_walletAddress);

    const _userInfo = await User.findOne({
      wallet_address: _walletAddress
    });
    if (_userInfo === null)
      return res_.send({ result: true, data: null });
    return res_.send({
      result: true,
      data: {
        username: _userInfo.username,
        balance: _userInfo.balance
      }
    });
  } catch (error) {
    return res_.send({ result: false, error: 'Error detected in server progress!' });
  }
}