// 统计精练 · 账号数据同步服务
// 轻量原生 HTTP 服务，仅监听 127.0.0.1:5180，由 nginx 以 /api/ 反代暴露
// 数据落盘：server/data/{username}.json  （{ updatedAt, data: {key: value} }）
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const SECRET_FILE = path.join(DATA_DIR, '.secret');
const PORT = 5180;
const HOST = '127.0.0.1';
const MAX_BODY = 25 * 1024 * 1024; // 25MB

// 与前端 src/utils/auth.ts 保持一致的 10 个账户
const ACCOUNTS = [
  { username: 'user01', password: 'Pass01#26', displayName: '学员 01' },
  { username: 'user02', password: 'Pass02#26', displayName: '学员 02' },
  { username: 'user03', password: 'Pass03#26', displayName: '学员 03' },
  { username: 'user04', password: 'Pass04#26', displayName: '学员 04' },
  { username: 'user05', password: 'Pass05#26', displayName: '学员 05' },
  { username: 'user06', password: 'Pass06#26', displayName: '学员 06' },
  { username: 'user07', password: 'Pass07#26', displayName: '学员 07' },
  { username: 'user08', password: 'Pass08#26', displayName: '学员 08' },
  { username: 'user09', password: 'Pass09#26', displayName: '学员 09' },
  { username: 'user10', password: 'Pass10#26', displayName: '学员 10' },
];

fs.mkdirSync(DATA_DIR, { recursive: true });

// 服务端密钥：首次启动生成并持久化，用于签发/校验 token（HMAC，无状态）
function loadSecret() {
  try {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } catch {
    const s = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
    return s;
  }
}
const SECRET = loadSecret();

// token = HMAC-SHA256(username, secret)，无状态校验
function tokenFor(username) {
  return crypto.createHmac('sha256', SECRET).update(`sync:${username}`).digest('hex');
}

function validToken(username, token) {
  if (!username || !token) return false;
  const expect = tokenFor(username);
  const a = Buffer.from(expect);
  const b = Buffer.from(String(token));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function userFile(username) {
  // 只允许白名单账户名，杜绝路径穿越
  if (!ACCOUNTS.some((a) => a.username === username)) return null;
  return path.join(DATA_DIR, `${username}.json`);
}

function readUserData(username) {
  const f = userFile(username);
  if (!f) return null;
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return { updatedAt: 0, data: {} };
  }
}

function writeUserData(username, data) {
  const f = userFile(username);
  if (!f) return null;
  // 数据与现有完全一致时不刷新时间戳，避免无意义推送引发"服务器较新"误判
  const existing = readUserData(username);
  if (existing && canonical(existing.data) === canonical(data)) {
    return existing;
  }
  const record = { updatedAt: Date.now(), data };
  const tmp = `${f}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(record));
  fs.renameSync(tmp, f); // 原子替换，避免半写文件
  return record;
}

// 规范化序列化（递归排序对象键），用于数据等价比较
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  try {
    // POST /api/login  {username, password} -> {ok, token, username, displayName}
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = JSON.parse(await readBody(req));
      const account = ACCOUNTS.find(
        (a) => a.username === String(body.username || '').trim().toLowerCase() && a.password === body.password
      );
      if (!account) return json(res, 401, { ok: false, error: '用户名或密码错误' });
      return json(res, 200, {
        ok: true,
        username: account.username,
        displayName: account.displayName,
        token: tokenFor(account.username),
      });
    }

    // 以下接口需要 Bearer token
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    // GET /api/sync?user=X -> {ok, updatedAt, data}
    if (req.method === 'GET' && url.pathname === '/api/sync') {
      const username = url.searchParams.get('user') || '';
      if (!validToken(username, token)) return json(res, 401, { ok: false, error: 'unauthorized' });
      const record = readUserData(username);
      if (record === null) return json(res, 403, { ok: false, error: 'forbidden' });
      return json(res, 200, { ok: true, updatedAt: record.updatedAt, data: record.data });
    }

    // POST /api/sync  {user, data} -> {ok, updatedAt}
    if (req.method === 'POST' && url.pathname === '/api/sync') {
      const body = JSON.parse(await readBody(req));
      const username = String(body.user || '');
      if (!validToken(username, token)) return json(res, 401, { ok: false, error: 'unauthorized' });
      if (typeof body.data !== 'object' || body.data === null || Array.isArray(body.data)) {
        return json(res, 400, { ok: false, error: 'data must be an object' });
      }
      const record = writeUserData(username, body.data);
      if (record === null) return json(res, 403, { ok: false, error: 'forbidden' });
      return json(res, 200, { ok: true, updatedAt: record.updatedAt });
    }

    // GET /api/health
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true, ts: Date.now() });
    }

    json(res, 404, { ok: false, error: 'not found' });
  } catch (err) {
    json(res, 400, { ok: false, error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`sync-server listening on http://${HOST}:${PORT}`);
});
