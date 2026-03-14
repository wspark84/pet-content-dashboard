const { loadData } = require('./_helpers');

module.exports = (req, res) => {
  const data = loadData();
  const stats = { total: 0, categories: {} };
  for (const cat of data.categories) {
    let catTotal = 0;
    for (const sub of cat.subcategories) catTotal += sub.topics.length;
    stats.categories[cat.name] = catTotal;
    stats.total += catTotal;
  }
  res.json(stats);
};
