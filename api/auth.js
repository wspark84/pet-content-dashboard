const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'pet-content-dashboard-fallback-secret-2026';
const TOKEN_EXPIRY = '24h';

// bcrypt hash of the password (never store plaintext)
const USERS = {
  efil: {
    passwordHash: '$2b$10$1lXrZI018akg5DxXEmPvLuBUh1CCsXti9FVKrHyut6xi5EGtX2Efy'
  }
};

// Simple in-memory rate limiting
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return true;
  // Clean old entries
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordAttempt(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'POST') {
    // LOGIN
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: '너무 많은 로그인 시도입니다. 15분 후 다시 시도해주세요.' });
    }

    let body = '';
    await new Promise((resolve) => {
      req.on('data', chunk => { body += chunk; });
      req.on('end', resolve);
    });

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: '잘못된 요청입니다.' });
    }

    const { id, password } = parsed;
    if (!id || !password) {
      return res.status(400).json({ error: 'ID와 비밀번호를 입력해주세요.' });
    }

    const user = USERS[id];
    if (!user) {
      recordAttempt(ip);
      return res.status(401).json({ error: 'ID 또는 비밀번호가 올바르지 않습니다.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      recordAttempt(ip);
      return res.status(401).json({ error: 'ID 또는 비밀번호가 올바르지 않습니다.' });
    }

    // Success — issue JWT
    clearAttempts(ip);
    const token = jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    // Set httpOnly cookie
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${24 * 60 * 60}`
    ]);

    return res.status(200).json({ ok: true });

  } else if (req.method === 'GET') {
    // VERIFY TOKEN
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      return res.status(200).json({ ok: true, user: payload.sub });
    } catch {
      return res.status(401).json({ error: '토큰이 만료되었거나 유효하지 않습니다.' });
    }

  } else if (req.method === 'DELETE') {
    // LOGOUT — clear cookie
    res.setHeader('Set-Cookie', [
      'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
    ]);
    return res.status(200).json({ ok: true });

  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};

function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach(pair => {
    const [key, ...vals] = pair.trim().split('=');
    if (key) cookies[key.trim()] = vals.join('=').trim();
  });
  return cookies;
}
