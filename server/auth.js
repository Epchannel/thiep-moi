const crypto = require('node:crypto');
const { createAdminSession, deleteAdminSession, findAdminSession } = require('./database');

const COOKIE_NAME = 'graduation_admin';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, encoded) {
  const [algorithm, saltHex, hashHex] = String(encoded).split(':');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const randomToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    if (index === -1) return [part, ''];
    const value = part.slice(index + 1);
    try { return [part.slice(0, index), decodeURIComponent(value)]; }
    catch { return [part.slice(0, index), '']; }
  }));
}

function createSession(response, adminId) {
  const token = randomToken();
  const csrfToken = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  createAdminSession({ tokenHash: hashToken(token), adminId, csrfToken, expiresAt });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`);
}

function clearSession(request, response) {
  const token = parseCookies(request.headers.cookie)[COOKIE_NAME];
  if (token) deleteAdminSession(hashToken(token));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function loadAdminSession(request, _response, next) {
  const token = parseCookies(request.headers.cookie)[COOKIE_NAME];
  request.adminSession = token ? findAdminSession(hashToken(token)) : null;
  next();
}

function requireAdmin(request, response, next) {
  if (!request.adminSession) return response.redirect(`/admin/login?next=${encodeURIComponent(request.originalUrl)}`);
  response.locals.admin = { id: request.adminSession.adminId, username: request.adminSession.username };
  response.locals.csrfToken = request.adminSession.csrfToken;
  return next();
}

function requireCsrf(request, response, next) {
  const supplied = typeof request.body.csrfToken === 'string' ? request.body.csrfToken : '';
  const expected = request.adminSession?.csrfToken || '';
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  const valid = suppliedBuffer.length === expectedBuffer.length && suppliedBuffer.length > 0
    && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
  if (!valid) return response.status(403).render('admin/error', { pageTitle: 'Yêu cầu không hợp lệ', message: 'Phiên làm việc hoặc CSRF token không hợp lệ.' });
  return next();
}

module.exports = { clearSession, createSession, hashPassword, loadAdminSession, randomToken, requireAdmin, requireCsrf, verifyPassword };
