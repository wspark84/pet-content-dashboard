const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'pet-content-dashboard-fallback-secret-2026';

function parseCookies(cookieHeader) {
  const cookies = {};
  (cookieHeader || '').split(';').forEach(pair => {
    const [key, ...vals] = pair.trim().split('=');
    if (key) cookies[key.trim()] = vals.join('=').trim();
  });
  return cookies;
}

/**
 * Auth middleware — verifies JWT from httpOnly cookie.
 * Returns the user payload if valid, or sends 401 and returns null.
 */
function requireAuth(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.auth_token;
  if (!token) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    res.status(401).json({ error: '토큰이 만료되었거나 유효하지 않습니다.' });
    return null;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gznarqkmuafkxotljfzu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    if (!SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.');
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// Fallback: 파일 기반 데이터 (Supabase 연결 실패 시)
const DATA_DIR = path.join(process.cwd(), 'data');

let _cache = null;
let _cacheTime = 0;

function loadData() {
  const now = Date.now();
  if (_cache && now - _cacheTime < 60000) return _cache;
  _cache = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'content-db.json'), 'utf8'));
  _cacheTime = now;
  return _cache;
}

function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'accounts.json'), 'utf8'));
  } catch (e) {
    return { accounts: [] };
  }
}

function getAllTopics() {
  const data = loadData();
  const topics = [];
  for (const cat of data.categories) {
    for (const sub of cat.subcategories) {
      for (let i = 0; i < sub.topics.length; i++) {
        const t = sub.topics[i];
        topics.push({
          ...t,
          _index: i,
          categoryId: cat.id,
          categoryName: cat.name,
          categoryIcon: cat.icon,
          subcategoryId: sub.id,
          subcategoryName: sub.name,
          subcategoryIcon: sub.icon
        });
      }
    }
  }
  return topics;
}

module.exports = { getSupabase, loadData, loadAccounts, getAllTopics, DATA_DIR, requireAuth };
