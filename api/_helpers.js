const fs = require('fs');
const path = require('path');

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

module.exports = { loadData, loadAccounts, getAllTopics, DATA_DIR };
