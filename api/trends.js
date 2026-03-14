const { getSupabase } = require('./_helpers');

module.exports = async (req, res) => {
  try {
    const supabase = getSupabase();

    const { data: topics, error } = await supabase
      .from('content_topics')
      .select('*')
      .order('viral_score', { ascending: false, nullsFirst: false })
      .limit(10);

    if (error) throw error;

    // Fetch lookup maps
    const { data: cats } = await supabase.from('content_categories').select('id, name, icon');
    const { data: subs } = await supabase.from('content_subcategories').select('id, category_id, name, icon');

    const catMap = {};
    for (const c of (cats || [])) catMap[c.id] = c;
    const subMap = {};
    for (const s of (subs || [])) subMap[`${s.category_id}:${s.id}`] = s;

    const mapped = topics.map(t => {
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

    res.json(mapped);
  } catch (err) {
    console.error('Trends API error:', err.message);
    res.status(500).json({ error: '트렌드 조회 실패', detail: err.message });
  }
};
