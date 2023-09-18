const User = require('../../models/user')

exports.getUserInfo = async (req_, res_) => {
  try {
    if (!req_.query.wallet_address)
      return res_.send({ result: false, error: 'Invalid get data!' });

    const _walletAddress = req_.query.wallet_address;

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

exports.createAccount = async (req_, res_) => {
  try {
    if (!req_.body.wallet_address || !req_.body.username)
      return res_.send({ result: false, error: 'Invalid post data!' });

    const _walletAddress = req_.body.wallet_address;
    const _username = req_.body.username;

    const _newUser = new User({
      wallet_address: _walletAddress,
      username: _username,
      balance: 0
    });
    await _newUser.save();

    return res_.send({
      result: true,
      data: {
        username: _username,
        balance: _newUser.balance
      }
    });
  } catch (error) {
    return res_.send({ result: false, error: 'Error detected in server progress!' });
  }
}