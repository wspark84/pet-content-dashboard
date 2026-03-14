const { getAllTopics } = require('./_helpers');

module.exports = (req, res) => {
  const topics = getAllTopics().sort((a, b) => b.viralScore - a.viralScore).slice(0, 10);
  res.json(topics);
};
