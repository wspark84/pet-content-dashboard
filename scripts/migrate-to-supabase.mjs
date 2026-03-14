#!/usr/bin/env node
/**
 * content-db.json → Supabase 마이그레이션 스크립트
 * 
 * 사용법:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/migrate-to-supabase.mjs
 * 
 * 주의: anon key가 아닌 service_role key를 사용해야 INSERT가 가능합니다.
 *       (또는 RLS INSERT 정책이 anon에 허용되어 있어야 합니다)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gznarqkmuafkxotljfzu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_ANON_KEY 환경변수를 설정해주세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load data
const dataPath = join(__dirname, '..', 'data', 'content-db.json');
console.log(`📂 Loading data from ${dataPath}...`);
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

async function migrateCategories() {
  console.log('\n📁 Migrating categories...');
  const categories = data.categories
    .filter(c => c.id) // id 없는 카테고리 제외
    .map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon || null
    }));
  // id 없는 카테고리에 id 부여
  data.categories.forEach(c => { if (!c.id) c.id = c.name.replace(/\s+/g, '-').toLowerCase(); });
  const catsWithId = data.categories.map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon || null
  }));

  const { data: result, error } = await supabase
    .from('content_categories')
    .upsert(catsWithId, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('❌ Categories error:', error.message);
    throw error;
  }
  console.log(`✅ ${categories.length} categories migrated`);
}

async function migrateSubcategories() {
  console.log('\n📂 Migrating subcategories...');
  const subcategories = [];

  for (const cat of data.categories) {
    if (!cat.id) cat.id = cat.name.replace(/\s+/g, '-').toLowerCase();
    for (const sub of cat.subcategories) {
      if (!sub.id) sub.id = sub.name.replace(/\s+/g, '-').toLowerCase();
      subcategories.push({
        id: sub.id,
        category_id: cat.id,
        name: sub.name,
        icon: sub.icon || null
      });
    }
  }

  const { data: result, error } = await supabase
    .from('content_subcategories')
    .upsert(subcategories, { onConflict: 'id,category_id' })
    .select();

  if (error) {
    console.error('❌ Subcategories error:', error.message);
    throw error;
  }
  console.log(`✅ ${subcategories.length} subcategories migrated`);
}

async function migrateTopics() {
  console.log('\n📄 Migrating topics...');
  const topics = [];

  for (const cat of data.categories) {
    for (const sub of cat.subcategories) {
      for (const topic of (sub.topics || [])) {
        topics.push({
          category_id: cat.id,
          subcategory_id: sub.id,
          title: topic.title,
          description: topic.description || null,
          summary: topic.summary || null,
          full_content: topic.fullContent || null,
          easy_content: topic.easyContent || null,
          tags: topic.tags || [],
          animal: topic.animal || null,
          difficulty: topic.difficulty || null,
          viral_score: topic.viralScore || null,
          key_points: topic.keyPoints || [],
          target_audience: topic.targetAudience || null,
          card_news_angle: topic.cardNewsAngle || null,
          references_data: topic.references || null,
          publications: topic.publications || null,
          image_prompts: topic.imagePrompts || null,
          source: topic.source || null,
          source_type: topic.sourceType || null,
          link: topic.link || null,
          views: topic.views || null,
          date: topic.date || null,
          crawled_at: topic.crawledAt || null
        });
      }
    }
  }

  console.log(`📊 Total topics to migrate: ${topics.length}`);

  // Batch insert (100개씩)
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    const batch = topics.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase
      .from('content_topics')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      // 개별 삽입 시도
      for (const topic of batch) {
        const { error: singleError } = await supabase
          .from('content_topics')
          .insert(topic);
        if (singleError) {
          console.error(`  ⚠️ Failed: "${topic.title}" - ${singleError.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }

    const progress = Math.min(i + BATCH_SIZE, topics.length);
    process.stdout.write(`\r  Progress: ${progress}/${topics.length} (${Math.round(progress / topics.length * 100)}%)`);
  }

  console.log(`\n✅ ${inserted} topics migrated successfully`);
}

async function verify() {
  console.log('\n🔍 Verifying migration...');

  const { count: catCount } = await supabase
    .from('content_categories')
    .select('*', { count: 'exact', head: true });

  const { count: subCount } = await supabase
    .from('content_subcategories')
    .select('*', { count: 'exact', head: true });

  const { count: topicCount } = await supabase
    .from('content_topics')
    .select('*', { count: 'exact', head: true });

  console.log(`  Categories: ${catCount}`);
  console.log(`  Subcategories: ${subCount}`);
  console.log(`  Topics: ${topicCount}`);
}

async function main() {
  console.log('🚀 Starting Supabase migration...');
  console.log(`  URL: ${SUPABASE_URL}`);

  try {
    await migrateCategories();
    await migrateSubcategories();
    await migrateTopics();
    await verify();
    console.log('\n🎉 Migration complete!');
  } catch (err) {
    console.error('\n💥 Migration failed:', err.message);
    process.exit(1);
  }
}

main();
