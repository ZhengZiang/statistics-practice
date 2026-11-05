// 账户体系：10 个独立账户，练习数据按账户隔离（localStorage 键带账户前缀）
export interface Account {
  username: string;
  password: string;
  displayName: string;
}

// 预置的 10 个账户，可自行修改用户名/密码
export const ACCOUNTS: Account[] = [
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

const CURRENT_USER_KEY = 'current_user';

export function login(username: string, password: string): Account | null {
  const account = ACCOUNTS.find(
    (a) => a.username === username.trim().toLowerCase() && a.password === password
  );
  if (!account) return null;
  localStorage.setItem(CURRENT_USER_KEY, account.username);
  return account;
}

export function logout(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser(): Account | null {
  const username = localStorage.getItem(CURRENT_USER_KEY);
  if (!username) return null;
  return ACCOUNTS.find((a) => a.username === username) || null;
}

// 当前账户的存储键前缀；未登录时返回空串（守卫会强制跳转登录页）
export function getStoragePrefix(): string {
  const username = localStorage.getItem(CURRENT_USER_KEY);
  return username ? `u:${username}:` : '';
}
