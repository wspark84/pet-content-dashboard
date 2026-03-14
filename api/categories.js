const { getSupabase } = require('./_helpers');

module.exports = async (req, res) => {
  try {
    const supabase = getSupabase();

    // Fetch categories
    const { data: categories, error: catErr } = await supabase
      .from('content_categories')
      .select('*')
      .order('name');

    if (catErr) throw catErr;

    // Fetch subcategories with topic counts
    const { data: subcategories, error: subErr } = await supabase
      .from('content_subcategories')
      .select('*')
      .order('name');

    if (subErr) throw subErr;

    // Fetch topic counts per subcategory (paginate to bypass 1000 row limit)
    let topicCounts = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page, error: countErr } = await supabase
        .from('content_topics')
        .select('category_id, subcategory_id')
        .range(from, from + pageSize - 1);
      if (countErr) throw countErr;
      topicCounts = topicCounts.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    // Count topics per subcategory
    const countMap = {};
    for (const t of topicCounts) {
      const key = `${t.category_id}:${t.subcategory_id}`;
      countMap[key] = (countMap[key] || 0) + 1;
    }

    // Build response
    const result = categories.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      subcategories: subcategories
        .filter(s => s.category_id === c.id)
        .map(s => ({
          id: s.id,
          name: s.name,
          icon: s.icon,
          count: countMap[`${c.id}:${s.id}`] || 0
        }))
    }));

    res.json(result);
  } catch (err) {
    console.error('Categories API error:', err.message);
    res.status(500).json({ error: '카테고리 조회 실패', detail: err.message });
  }
};
