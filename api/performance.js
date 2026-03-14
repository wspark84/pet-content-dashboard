const { getSupabase, requireAuth } = require('./_helpers');

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const supabase = getSupabase();

    const { data: topics, error } = await supabase
      .from('content_topics')
      .select('publications');

    if (error) throw error;

    let totalPublished = 0;
    let totalUnused = 0;
    const accountStats = {};

    for (const topic of topics) {
      const pubs = topic.publications || [];
      if (pubs.length > 0) {
        totalPublished++;
        for (const pub of pubs) {
          if (!accountStats[pub.accountId]) {
            accountStats[pub.accountId] = {
              id: pub.accountId,
              name: pub.accountId,
              platform: pub.platform || 'unknown',
              publishedCount: 0,
              totalViews: 0,
              totalLikes: 0,
              totalComments: 0,
              totalShares: 0
            };
          }
          accountStats[pub.accountId].publishedCount++;
          accountStats[pub.accountId].totalViews += pub.metrics?.views || 0;
          accountStats[pub.accountId].totalLikes += pub.metrics?.likes || 0;
          accountStats[pub.accountId].totalComments += pub.metrics?.comments || 0;
          accountStats[pub.accountId].totalShares += pub.metrics?.shares || 0;
        }
      } else {
        totalUnused++;
      }
    }

    res.json({
      totalTopics: topics.length,
      totalPublished,
      totalUnused,
      accountStats: Object.values(accountStats)
    });
  } catch (err) {
    console.error('Performance API error:', err.message);
    res.status(500).json({ error: '성과 데이터 조회 실패', detail: err.message });
  }
};
