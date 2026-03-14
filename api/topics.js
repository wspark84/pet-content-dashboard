const { getSupabase } = require('./_helpers');

module.exports = async (req, res) => {
  try {
    const supabase = getSupabase();
    const { q, animal, category, subcategory, difficulty, sort } = req.query;

    // Build query - select topics with category/subcategory info
    let query = supabase.from('content_topics').select('*');

    // Filters
    if (category) {
      query = query.eq('category_id', category);
    }
    if (subcategory) {
      query = query.eq('subcategory_id', subcategory);
    }
    if (animal && animal !== 'all') {
      query = query.or(`animal.eq.${animal},animal.eq.both`);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    // Sort
    if (sort === 'alpha') {
      query = query.order('title', { ascending: true });
    } else {
      query = query.order('viral_score', { ascending: false, nullsFirst: false });
    }

    const { data: topics, error } = await query;
    if (error) throw error;

    // Fetch category/subcategory lookup maps
    const { data: cats } = await supabase.from('content_categories').select('id, name, icon');
    const { data: subs } = await supabase.from('content_subcategories').select('id, category_id, name, icon');

    const catMap = {};
    for (const c of (cats || [])) catMap[c.id] = c;

    const subMap = {};
    for (const s of (subs || [])) subMap[`${s.category_id}:${s.id}`] = s;

    // Filter by search query (text + tags)
    let filtered = topics;
    if (q) {
      const lq = q.toLowerCase();
      filtered = topics.filter(t =>
        t.title?.toLowerCase().includes(lq) ||
        t.description?.toLowerCase().includes(lq) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(lq))
      );
    }

    // Map to frontend format (camelCase)
    const mapped = filtered.map(t => {
      const cat = catMap[t.category_id] || {};
      const sub = subMap[`${t.category_id}:${t.subcategory_id}`] || {};
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        summary: t.summary,
        fullContent: t.full_content,
        easyContent: t.easy_content,
        tags: t.tags,
        animal: t.animal,
        difficulty: t.difficulty,
        viralScore: t.viral_score,
        keyPoints: t.key_points,
        targetAudience: t.target_audience,
        cardNewsAngle: t.card_news_angle,
        references: t.references_data,
        publications: t.publications,
        imagePrompts: t.image_prompts,
        source: t.source,
        sourceType: t.source_type,
        link: t.link,
        views: t.views,
        date: t.date,
        crawledAt: t.crawled_at,
        categoryId: t.category_id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        subcategoryId: t.subcategory_id,
        subcategoryName: sub.name,
        subcategoryIcon: sub.icon
      };
    });

    res.json({ total: mapped.length, topics: mapped });
  } catch (err) {
    console.error('Topics API error:', err.message);
    res.status(500).json({ error: '토픽 조회 실패', detail: err.message });
  }
};
