const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const compression = require('compression');
const db = require('./server/database');
const auth = require('./server/auth');
const { clean, RESERVED_SLUGS, validateGuest } = require('./server/validation');

const app = express();
app.use(compression());
const port = Number.parseInt(process.env.PORT, 10) || 3000;
const host = process.env.HOST || '0.0.0.0';
const rootDirectory = __dirname;
const avatarDirectory = path.join(rootDirectory, 'uploads', 'avatars');
fs.mkdirSync(avatarDirectory, { recursive: true });
let setupToken = db.adminCount() === 0 ? (process.env.ADMIN_SETUP_TOKEN || auth.randomToken()) : null;

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: avatarDirectory,
    filename: (_request, file, callback) => {
      const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
      callback(null, `${crypto.randomUUID()}${extensions[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    callback(allowed.includes(file.mimetype) ? null : new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.'), allowed.includes(file.mimetype));
  },
});

app.set('view engine', 'ejs');
app.set('views', path.join(rootDirectory, 'views'));
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');
app.locals.formatDate = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
  : '—';
app.locals.attendanceLabel = { unconfirmed: 'Chưa phản hồi', attending: 'Sẽ tham dự', declined: 'Không tham dự' };
app.locals.wishStatusLabel = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      frameSrc: ["'self'", 'https://www.google.com'],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '30kb' }));
app.use(auth.loadAdminSession);
app.use('/admin', (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau.' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  message: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.',
});

function safeTokenEqual(first, second) {
  const a = Buffer.from(String(first || ''));
  const b = Buffer.from(String(second || ''));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function getSafeNext(value) {
  return typeof value === 'string' && value.startsWith('/admin/') && !value.startsWith('//') ? value : '/admin';
}

function emptyGuest() {
  return {
    fullName: '', slug: '', salutation: '', avatarUrl: '', relationship: '', personalMessage: '',
    phone: '', note: '', status: 'active', attendanceStatus: 'unconfirmed', partySize: 1,
  };
}

function removeLocalAvatar(avatarUrl) {
  if (!avatarUrl?.startsWith('/uploads/avatars/')) return;
  const filename = path.basename(avatarUrl);
  fs.rm(path.join(avatarDirectory, filename), { force: true }, () => {});
}

function applyAvatarInput(request, existingAvatar = '') {
  if (request.file) return `/uploads/avatars/${request.file.filename}`;
  if (request.body.removeAvatar === '1') return '';
  return clean(request.body.avatarUrl, 2048) || existingAvatar;
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

app.get('/api/wishes', (request, response) => {
  const requestedLimit = Number.parseInt(request.query.limit, 10);
  const requestedOffset = Number.parseInt(request.query.offset, 10);
  const sort = ['newest', 'popular'].includes(request.query.sort) ? request.query.sort : 'newest';
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
  response.json({ wishes: db.listApprovedWishes({ limit, offset, sort }) });
});

app.post('/api/wishes', publicSubmissionLimiter, (request, response) => {
  const guestName = clean(request.body.guestName, 80);
  const message = clean(request.body.message, 1000);
  if (!guestName) return response.status(400).json({ error: 'Họ tên là bắt buộc.' });
  if (!message) return response.status(400).json({ error: 'Lời chúc là bắt buộc.' });
  return response.status(201).json({ wish: db.createWish({ guestName, message }) });
});

app.post('/api/wishes/:id/like', (request, response) => {
  const id = Number.parseInt(request.params.id, 10);
  if (!id || Number.isNaN(id)) return response.status(400).json({ error: 'ID không hợp lệ.' });
  const result = db.likeWish(id);
  if (!result) return response.status(404).json({ error: 'Lời chúc không tồn tại.' });
  return response.json({ likes: result.likes });
});

app.post('/api/invitations/:slug/respond', publicSubmissionLimiter, (request, response) => {
  const guest = db.getGuestBySlug(request.params.slug);
  if (!guest) return response.status(404).json({ error: 'Không tìm thấy thiệp mời.' });
  const attendanceStatus = ['attending', 'declined'].includes(request.body.attendanceStatus)
    ? request.body.attendanceStatus : '';
  if (!attendanceStatus) return response.status(400).json({ error: 'Vui lòng chọn trạng thái tham dự.' });
  const partySize = attendanceStatus === 'attending'
    ? Math.min(Math.max(Number.parseInt(request.body.partySize, 10) || 1, 1), 20) : 1;
  const message = clean(request.body.message, 1000);
  db.saveGuestResponse({ guest, attendanceStatus, partySize, message });
  return response.json({ message: 'Phản hồi của bạn đã được lưu. Cảm ơn bạn!' });
});

app.get('/admin/setup', (request, response) => {
  if (db.adminCount() > 0) return response.redirect('/admin/login');
  const token = clean(request.query.token, 200);
  if (!safeTokenEqual(token, setupToken)) return response.status(403).render('admin/setup-required', { pageTitle: 'Thiết lập quản trị' });
  return response.render('admin/setup', { pageTitle: 'Tạo tài khoản quản trị', token, error: '' });
});

app.post('/admin/setup', loginLimiter, (request, response) => {
  if (db.adminCount() > 0) return response.redirect('/admin/login');
  const token = clean(request.body.token, 200);
  const username = clean(request.body.username, 50);
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  const confirmPassword = typeof request.body.confirmPassword === 'string' ? request.body.confirmPassword : '';
  let error = '';
  if (!safeTokenEqual(token, setupToken)) error = 'Setup token không hợp lệ.';
  else if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username)) error = 'Tên đăng nhập cần 3–50 ký tự và không chứa khoảng trắng.';
  else if (password.length < 10) error = 'Mật khẩu phải có ít nhất 10 ký tự.';
  else if (password !== confirmPassword) error = 'Mật khẩu nhập lại không khớp.';
  if (error) return response.status(400).render('admin/setup', { pageTitle: 'Tạo tài khoản quản trị', token, error });
  const adminId = db.createAdmin({ username, passwordHash: auth.hashPassword(password) });
  setupToken = null;
  auth.createSession(response, adminId);
  return response.redirect('/admin');
});

app.get('/admin/login', (request, response) => {
  if (request.adminSession) return response.redirect('/admin');
  return response.render('admin/login', { pageTitle: 'Đăng nhập', error: '', next: getSafeNext(request.query.next) });
});

app.post('/admin/login', loginLimiter, (request, response) => {
  const username = clean(request.body.username, 50);
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  const admin = db.findAdminByUsername(username);
  if (!admin || !auth.verifyPassword(password, admin.passwordHash)) {
    return response.status(401).render('admin/login', { pageTitle: 'Đăng nhập', error: 'Tên đăng nhập hoặc mật khẩu không đúng.', next: getSafeNext(request.body.next) });
  }
  auth.createSession(response, admin.id);
  return response.redirect(getSafeNext(request.body.next));
});

app.post('/admin/logout', auth.requireAdmin, auth.requireCsrf, (request, response) => {
  auth.clearSession(request, response);
  response.redirect('/admin/login');
});

app.get('/admin', auth.requireAdmin, (_request, response) => {
  response.render('admin/dashboard', { pageTitle: 'Tổng quan', activePage: 'dashboard', stats: db.getDashboardStats() });
});

app.get('/admin/guests', auth.requireAdmin, (request, response) => {
  const filters = { search: clean(request.query.search, 100), status: clean(request.query.status, 20), attendance: clean(request.query.attendance, 20) };
  response.render('admin/guests-list', {
    pageTitle: 'Khách mời', activePage: 'guests', guests: db.listGuests(filters), filters,
    notice: clean(request.query.notice, 200),
  });
});

app.get('/admin/guests/new', auth.requireAdmin, (_request, response) => {
  response.render('admin/guest-form', { pageTitle: 'Thêm khách mời', activePage: 'guests', guest: emptyGuest(), errors: [], isEdit: false });
});

app.post('/admin/guests', auth.requireAdmin, avatarUpload.single('avatarFile'), auth.requireCsrf, (request, response) => {
  request.body.avatarUrl = applyAvatarInput(request);
  const { guest, errors } = validateGuest(request.body, { slugExists: db.slugExists });
  if (errors.length) {
    if (request.file) removeLocalAvatar(request.body.avatarUrl);
    return response.status(400).render('admin/guest-form', { pageTitle: 'Thêm khách mời', activePage: 'guests', guest, errors, isEdit: false });
  }
  db.createGuest(guest);
  return response.redirect('/admin/guests?notice=' + encodeURIComponent('Đã tạo khách mời và link thiệp.'));
});

app.get('/admin/guests/:id/edit', auth.requireAdmin, (request, response) => {
  const guest = db.getGuestById(Number.parseInt(request.params.id, 10));
  if (!guest) return response.status(404).render('admin/error', { pageTitle: 'Không tìm thấy', message: 'Khách mời không tồn tại.' });
  return response.render('admin/guest-form', { pageTitle: 'Chỉnh sửa khách mời', activePage: 'guests', guest, errors: [], isEdit: true });
});

app.post('/admin/guests/:id', auth.requireAdmin, avatarUpload.single('avatarFile'), auth.requireCsrf, (request, response) => {
  const id = Number.parseInt(request.params.id, 10);
  const existingGuest = db.getGuestById(id);
  if (!existingGuest) {
    if (request.file) removeLocalAvatar(`/uploads/avatars/${request.file.filename}`);
    return response.status(404).render('admin/error', { pageTitle: 'Không tìm thấy', message: 'Khách mời không tồn tại.' });
  }
  request.body.avatarUrl = applyAvatarInput(request, existingGuest.avatarUrl);
  const { guest, errors } = validateGuest(request.body, { slugExists: db.slugExists, currentId: id });
  guest.id = id;
  if (errors.length) {
    if (request.file) removeLocalAvatar(request.body.avatarUrl);
    return response.status(400).render('admin/guest-form', { pageTitle: 'Chỉnh sửa khách mời', activePage: 'guests', guest, errors, isEdit: true });
  }
  db.updateGuest(id, guest);
  if (existingGuest.avatarUrl !== guest.avatarUrl) removeLocalAvatar(existingGuest.avatarUrl);
  return response.redirect('/admin/guests?notice=' + encodeURIComponent('Đã cập nhật khách mời.'));
});

app.post('/admin/guests/:id/delete', auth.requireAdmin, auth.requireCsrf, (request, response) => {
  const id = Number.parseInt(request.params.id, 10);
  const guest = db.getGuestById(id);
  db.deleteGuest(id);
  removeLocalAvatar(guest?.avatarUrl);
  response.redirect('/admin/guests?notice=' + encodeURIComponent('Đã xóa khách mời.'));
});

app.get('/admin/wishes', auth.requireAdmin, (request, response) => {
  const filters = { status: clean(request.query.status, 20), search: clean(request.query.search, 100) };
  response.render('admin/wishes-list', {
    pageTitle: 'Lời chúc', activePage: 'wishes', wishes: db.listAdminWishes(filters), filters,
    notice: clean(request.query.notice, 200),
  });
});

app.post('/admin/wishes/:id/status', auth.requireAdmin, auth.requireCsrf, (request, response) => {
  const status = ['pending', 'approved', 'rejected'].includes(request.body.status) ? request.body.status : '';
  if (!status) return response.status(400).render('admin/error', { pageTitle: 'Dữ liệu sai', message: 'Trạng thái lời chúc không hợp lệ.' });
  db.updateWishStatus(Number.parseInt(request.params.id, 10), status);
  response.redirect('/admin/wishes?notice=' + encodeURIComponent('Đã cập nhật trạng thái lời chúc.'));
});

app.post('/admin/wishes/:id/delete', auth.requireAdmin, auth.requireCsrf, (request, response) => {
  db.deleteWish(Number.parseInt(request.params.id, 10));
  response.redirect('/admin/wishes?notice=' + encodeURIComponent('Đã xóa lời chúc.'));
});

app.use((request, response, next) => {
  const blockedPaths = ['/server', '/data', '/views', '/node_modules'];
  const blockedFiles = ['/server.js', '/package.json', '/package-lock.json', '/README.md'];
  if (blockedPaths.some((entry) => request.path === entry || request.path.startsWith(`${entry}/`)) || blockedFiles.includes(request.path)) {
    return response.status(404).send('Not found');
  }
  return next();
});

app.use(express.static(rootDirectory, {
  dotfiles: 'ignore',
  index: 'index.html',
  maxAge: '7d',
  setHeaders: (response, filePath) => {
    if (filePath.endsWith('.ttf') || filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.webp') || filePath.endsWith('.mp3')) {
      response.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    } else if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
      response.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
}));

app.get('/:slug', (request, response, next) => {
  const slug = clean(request.params.slug, 100).toLocaleLowerCase('vi-VN');
  if (!slug || RESERVED_SLUGS.has(slug) || slug.includes('.')) return next();
  const guest = db.getGuestBySlug(slug);
  if (!guest) return response.status(404).render('invitation-not-found', { pageTitle: 'Không tìm thấy thiệp mời' });
  db.recordGuestView(guest.id);
  return response.render('invitation', { pageTitle: `Thiệp mời dành cho ${guest.fullName}`, guest });
});

app.use((request, response) => {
  if (request.path.startsWith('/api/')) return response.status(404).json({ error: 'Không tìm thấy API.' });
  return response.status(404).render('invitation-not-found', { pageTitle: 'Không tìm thấy trang' });
});

app.use((error, request, response, _next) => {
  console.error(error);
  if (request.path.startsWith('/api/')) return response.status(500).json({ error: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.' });
  if (request.path.startsWith('/admin/') && response.locals.admin) {
    const uploadMessage = error instanceof multer.MulterError
      ? (error.code === 'LIMIT_FILE_SIZE' ? 'Ảnh vượt quá giới hạn 5 MB.' : 'Không thể tải file ảnh lên.')
      : error.message === 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.' ? error.message : 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
    return response.status(error instanceof multer.MulterError || error.message.includes('JPG') ? 400 : 500)
      .render('admin/error', { pageTitle: 'Không thể xử lý yêu cầu', message: uploadMessage });
  }
  return response.status(500).render('invitation-not-found', { pageTitle: 'Đã xảy ra lỗi' });
});

app.listen(port, host, () => {
  console.log(`Graduation website is running at http://${host}:${port}`);
  if (setupToken) console.log(`Create the first admin at http://localhost:${port}/admin/setup?token=${setupToken}`);
});
