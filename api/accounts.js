const { requireAuth } = require('./_helpers');

module.exports = (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  res.json({ accounts: [] });
};
