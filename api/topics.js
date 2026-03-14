const { getAllTopics } = require('./_helpers');

module.exports = (req, res) => {
  let topics = getAllTopics();
  const { q, animal, category, subcategory, difficulty, sort } = req.query;
  if (q) {
    const lq = q.toLowerCase();
    topics = topics.filter(t => t.title.toLowerCase().includes(lq) || t.description.toLowerCase().includes(lq) || t.tags.some(tag => tag.toLowerCase().includes(lq)));
  }
  if (animal && animal !== 'all') topics = topics.filter(t => t.animal === animal || t.animal === 'both');
  if (category) topics = topics.filter(t => t.categoryId === category);
  if (subcategory) topics = topics.filter(t => t.subcategoryId === subcategory);
  if (difficulty) topics = topics.filter(t => t.difficulty === difficulty);
  if (sort === 'viral') topics.sort((a, b) => b.viralScore - a.viralScore);
  else if (sort === 'alpha') topics.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  else topics.sort((a, b) => b.viralScore - a.viralScore);
  res.json({ total: topics.length, topics });
};
