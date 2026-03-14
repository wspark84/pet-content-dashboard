const { loadData } = require('./_helpers');

module.exports = (req, res) => {
  const data = loadData();
  const cats = data.categories.map(c => ({
    id: c.id, name: c.name, icon: c.icon,
    subcategories: c.subcategories.map(s => ({ id: s.id, name: s.name, icon: s.icon, count: s.topics.length }))
  }));
  res.json(cats);
};
