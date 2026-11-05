// 账号数据云端同步层
// 与服务端 server/sync-server.mjs 配合：
//   - 登录成功后拉取服务器数据（按 updatedAt 决定覆盖方向，last-write-wins）
//   - 本地每次写入后防抖推送到服务器
// 所有同步失败静默降级为纯本地模式，绝不影响做题。
import { ACCOUNTS, login, getStoragePrefix } from './auth';

// 参与同步的用户数据键（不含题库 exam_questions —— 题库随应用静态分发）
const SYNC_KEYS = [
  'answer_records',
  'wrong_questions',
  'mastery_data',
  'trend_data',
  'practice_draft',
  'exam_draft',
  'exam_records',
] as const;

const META_KEY = 'sync_updatedAt'; // 记录本地最后一次与服务器一致的时间戳（带账户前缀存储）
const PUSH_DEBOUNCE_MS = 2500;
const FETCH_TIMEOUT_MS = 6000;

function tokenKey(username: string): string {
  return `sync_token:${username}`;
}

export function getSyncToken(username: string): string | null {
  return localStorage.getItem(tokenKey(username));
}

function saveSyncToken(username: string, token: string): void {
  localStorage.setItem(tokenKey(username), token);
}

function getLocalSyncedAt(): number {
  try {
    return Number(localStorage.getItem(getStoragePrefix() + META_KEY)) || 0;
  } catch {
    return 0;
  }
}

function setLocalSyncedAt(ts: number): void {
  localStorage.setItem(getStoragePrefix() + META_KEY, String(ts));
}

// 带超时与静默降级的 fetch
async function apiFetch(path: string, options: RequestInit): Promise<Response | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(path, { ...options, signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch {
    return null; // 网络异常：静默降级
  }
}

// 收集当前账户的全部待同步数据
function collectLocalData(): Record<string, unknown> {
  const prefix = getStoragePrefix();
  const data: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(prefix + key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        // 跳过损坏的键
      }
    }
  }
  return data;
}

// 把服务器数据整体写入本地（服务器较新时调用）
function applyServerData(data: Record<string, unknown>): void {
  const prefix = getStoragePrefix();
  for (const key of SYNC_KEYS) {
    if (key in data) {
      localStorage.setItem(prefix + key, JSON.stringify(data[key]));
    } else {
      localStorage.removeItem(prefix + key); // 服务器没有的键视为已清除
    }
  }
}

// 推送本地全量数据到服务器
export async function pushNow(): Promise<void> {
  const prefix = getStoragePrefix();
  const m = /^u:([^:]+):$/.exec(prefix);
  if (!m) return;
  const username = m[1];
  const token = getSyncToken(username);
  if (!token) return;

  const res = await apiFetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user: username, data: collectLocalData() }),
  });
  if (!res || !res.ok) return;
  try {
    const body = await res.json();
    if (body && body.ok && typeof body.updatedAt === 'number') {
      setLocalSyncedAt(body.updatedAt);
    }
  } catch {
    // 忽略响应解析错误
  }
}

// 从服务器拉取；服务器较新则覆盖本地，本地较新则反向推送
async function pullAndMerge(): Promise<void> {
  const prefix = getStoragePrefix();
  const m = /^u:([^:]+):$/.exec(prefix);
  if (!m) return;
  const username = m[1];
  const token = getSyncToken(username);
  if (!token) return;

  const res = await apiFetch(`/api/sync?user=${encodeURIComponent(username)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res || !res.ok) return;

  let body: { ok: boolean; updatedAt?: number; data?: Record<string, unknown> };
  try {
    body = await res.json();
  } catch {
    return;
  }
  if (!body || !body.ok) return;

  const serverAt = typeof body.updatedAt === 'number' ? body.updatedAt : 0;
  const serverData = body.data || {};
  const localAt = getLocalSyncedAt();
  const localHasData = SYNC_KEYS.some((k) => localStorage.getItem(prefix + k) !== null);

  if (serverAt > localAt) {
    // 服务器较新：覆盖本地
    applyServerData(serverData);
    setLocalSyncedAt(serverAt);
  } else if (serverAt === 0 && localHasData) {
    // 首次迁移：服务器无数据、本地有数据 -> 以本地为准上传
    await pushNow();
  }
  // 其余情况（本地较新或两边一致且都没数据）不动作，
  // 本地后续写入时防抖推送自然会把本地数据带上服务器
}

// ---- 对外接口 ----

let pushTimer: ReturnType<typeof setTimeout> | null = null;

// 本地数据变更后调用：防抖推送
export function scheduleSyncPush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

// 登录（带同步）：先校验账号，再尝试服务器登录拿 token，成功后按新旧合并数据
// 服务器不可用时静默降级为纯本地登录
export async function loginWithSync(
  username: string,
  password: string
): Promise<{ ok: boolean; synced: boolean }> {
  const uname = username.trim().toLowerCase();
  const account = ACCOUNTS.find((a) => a.username === uname && a.password === password);
  if (!account) return { ok: false, synced: false };

  // 先尝试服务器登录拿 token
  const res = await apiFetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, password }),
  });

  let synced = false;
  if (res && res.ok) {
    try {
      const body = await res.json();
      if (body && body.ok && body.token) {
        saveSyncToken(account.username, body.token);
        synced = true;
      }
    } catch {
      // token 保存失败则降级
    }
  }

  // 本地登录（写入 current_user），与原有行为一致
  login(username, password);

  // 已拿到 token：拉取合并（可能覆盖本地数据）
  if (synced) {
    await pullAndMerge();
  }

  return { ok: true, synced };
}

// 应用启动时后台拉取（已有登录态的会话，服务器若有更新则覆盖本地并刷新页面）
// 每个标签页会话最多触发一次刷新，杜绝刷新循环
export async function backgroundPullIfNewer(): Promise<void> {
  const prefix = getStoragePrefix();
  if (!prefix) return;
  const m = /^u:([^:]+):$/.exec(prefix);
  if (!m) return;
  const username = m[1];
  const token = getSyncToken(username);
  if (!token) return;

  const res = await apiFetch(`/api/sync?user=${encodeURIComponent(username)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res || !res.ok) return;

  let body: { ok: boolean; updatedAt?: number; data?: Record<string, unknown> };
  try {
    body = await res.json();
  } catch {
    return;
  }
  if (!body || !body.ok) return;

  const serverAt = typeof body.updatedAt === 'number' ? body.updatedAt : 0;
  if (serverAt > getLocalSyncedAt()) {
    // 本标签页已因同步刷新过一次则不再刷新，避免循环
    if (sessionStorage.getItem('sync_boot_reloaded') === '1') return;
    sessionStorage.setItem('sync_boot_reloaded', '1');
    applyServerData(body.data || {});
    setLocalSyncedAt(serverAt);
    // 数据已被覆盖，刷新页面让各 store 重新加载
    window.location.reload();
  }
}
