const { getSupabase } = require('./_helpers');

module.exports = async (req, res) => {
  try {
    const supabase = getSupabase();

    // Get total count
    const { count: total, error: totalErr } = await supabase
      .from('content_topics')
      .select('*', { count: 'exact', head: true });

    if (totalErr) throw totalErr;

    // Get categories with names
    const { data: categories, error: catErr } = await supabase
      .from('content_categories')
      .select('id, name');

    if (catErr) throw catErr;

    // Get counts per category
    const { data: topicsByCat, error: countErr } = await supabase
      .from('content_topics')
      .select('category_id');

    if (countErr) throw countErr;

    // Count
    const countMap = {};
    for (const t of topicsByCat) {
      countMap[t.category_id] = (countMap[t.category_id] || 0) + 1;
    }

    const stats = { total, categories: {} };
    for (const cat of categories) {
      stats.categories[cat.name] = countMap[cat.id] || 0;
    }

    res.json(stats);
  } catch (err) {
    console.error('Stats API error:', err.message);
    res.status(500).json({ error: '통계 조회 실패', detail: err.message });
  }
};
