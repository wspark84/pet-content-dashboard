-- Supabase 테이블 생성 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- categories 테이블
CREATE TABLE IF NOT EXISTS content_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT
);

-- subcategories 테이블
CREATE TABLE IF NOT EXISTS content_subcategories (
  id TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES content_categories(id),
  name TEXT NOT NULL,
  icon TEXT,
  PRIMARY KEY (id, category_id)
);

-- topics 테이블 (메인)
CREATE TABLE IF NOT EXISTS content_topics (
  id SERIAL PRIMARY KEY,
  category_id TEXT NOT NULL,
  subcategory_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  summary TEXT,
  full_content TEXT,
  easy_content TEXT,
  tags TEXT[],
  animal TEXT,
  difficulty TEXT,
  viral_score INTEGER,
  key_points TEXT[],
  target_audience TEXT,
  card_news_angle TEXT,
  references_data JSONB,
  publications JSONB,
  image_prompts JSONB,
  source TEXT,
  source_type TEXT,
  link TEXT,
  views INTEGER,
  date TEXT,
  crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_topics_category ON content_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_topics_subcategory ON content_topics(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_topics_animal ON content_topics(animal);
CREATE INDEX IF NOT EXISTS idx_topics_difficulty ON content_topics(difficulty);
CREATE INDEX IF NOT EXISTS idx_topics_viral ON content_topics(viral_score DESC);

-- RLS 활성화 + public read 정책
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read categories" ON content_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read subcategories" ON content_subcategories FOR SELECT USING (true);
CREATE POLICY "Allow public read topics" ON content_topics FOR SELECT USING (true);

-- INSERT 정책 (service_role이나 authenticated 사용 시)
CREATE POLICY "Allow service insert categories" ON content_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service insert subcategories" ON content_subcategories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service insert topics" ON content_topics FOR INSERT WITH CHECK (true);
