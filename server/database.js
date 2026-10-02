const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const dataDirectory = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDirectory, { recursive: true });
const database = new Database(path.join(dataDirectory, 'wishes.db'));
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');

database.exec(`
  CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL CHECK(length(full_name) BETWEEN 1 AND 100),
    slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
    salutation TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    relationship TEXT NOT NULL DEFAULT '',
    personal_message TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'hidden')),
    attendance_status TEXT NOT NULL DEFAULT 'unconfirmed'
      CHECK(attendance_status IN ('unconfirmed', 'attending', 'declined')),
    party_size INTEGER NOT NULL DEFAULT 1 CHECK(party_size BETWEEN 1 AND 20),
    view_count INTEGER NOT NULL DEFAULT 0,
    first_viewed_at TEXT,
    last_viewed_at TEXT,
    responded_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_guests_status_created_at ON guests(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON admin_sessions(expires_at);
  CREATE TABLE IF NOT EXISTS wishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL CHECK(length(guest_name) BETWEEN 1 AND 80),
    message TEXT NOT NULL CHECK(length(message) BETWEEN 1 AND 1000),
    status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_wishes_status_created_at ON wishes(status, created_at DESC, id DESC);
`);

const wishColumns = database.prepare('PRAGMA table_info(wishes)').all().map((column) => column.name);
if (!wishColumns.includes('guest_id')) {
  database.exec('ALTER TABLE wishes ADD COLUMN guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL');
}
if (!wishColumns.includes('likes')) {
  database.exec('ALTER TABLE wishes ADD COLUMN likes INTEGER NOT NULL DEFAULT 0');
}

const getMetadata = database.prepare('SELECT value FROM app_metadata WHERE key = ?');
const setMetadata = database.prepare('INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)');
const countWishes = database.prepare('SELECT COUNT(*) AS count FROM wishes');
const insertWishStatement = database.prepare(`
  INSERT INTO wishes (guest_name, message, status, guest_id, created_at, updated_at)
  VALUES (@guestName, @message, @status, @guestId, @createdAt, @updatedAt)
`);

if (!getMetadata.get('initial_wishes_seeded')) {
  database.transaction(() => {
    if (countWishes.get().count === 0) {
      const seeds = [
        ['Anh Nam (Lớp Trưởng)', 'Chúc mừng tân kỹ sư! Chúc bạn tương lai rộng mở, sự nghiệp thành công và luôn vững bước trên con đường đã chọn nhé!'],
        ['Thu Hà (Hội Bạn Thân)', 'Tốt nghiệp rồi, chúc cô gái/chàng trai của chúng ta luôn rạng rỡ, xinh đẹp và đạt được mọi ước mơ thuở sinh viên!'],
        ['Hoàng Đức (Anh Trai)', 'Tự hào về em rất nhiều! Chúc mừng cột mốc quan trọng trong cuộc đời. Hẹn gặp em tại lễ tốt nghiệp nhé!'],
      ];
      seeds.forEach(([guestName, message], index) => {
        const timestamp = new Date(Date.now() - (index * 2 + 1) * 60 * 60 * 1000).toISOString();
        insertWishStatement.run({ guestName, message, status: 'approved', guestId: null, createdAt: timestamp, updatedAt: timestamp });
      });
    }
    setMetadata.run('initial_wishes_seeded', 'true');
  })();
}

const now = () => new Date().toISOString();

function listApprovedWishes({ limit = 50, offset = 0, sort = 'newest' } = {}) {
  const orderBy = sort === 'popular'
    ? 'likes DESC, datetime(created_at) DESC, id DESC'
    : 'datetime(created_at) DESC, id DESC';
  return database.prepare(`
    SELECT id, guest_name AS guestName, message, guest_id AS guestId, likes, created_at AS createdAt
    FROM wishes WHERE status = 'approved'
    ORDER BY ${orderBy} LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function likeWish(id) {
  database.prepare('UPDATE wishes SET likes = likes + 1 WHERE id = ? AND status = "approved"').run(id);
  return database.prepare('SELECT id, likes FROM wishes WHERE id = ?').get(id);
}

function createWish({ guestName, message, guestId = null, status = 'approved' }) {
  const timestamp = now();
  const result = insertWishStatement.run({ guestName, message, guestId, status, createdAt: timestamp, updatedAt: timestamp });
  return database.prepare(`
    SELECT id, guest_name AS guestName, message, guest_id AS guestId, status, created_at AS createdAt
    FROM wishes WHERE id = ?
  `).get(result.lastInsertRowid);
}

function adminCount() {
  return database.prepare('SELECT COUNT(*) AS count FROM admins').get().count;
}

function createAdmin({ username, passwordHash }) {
  const timestamp = now();
  return database.prepare('INSERT INTO admins (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(username, passwordHash, timestamp, timestamp).lastInsertRowid;
}

function findAdminByUsername(username) {
  return database.prepare('SELECT id, username, password_hash AS passwordHash FROM admins WHERE username = ? COLLATE NOCASE').get(username);
}

function createAdminSession({ tokenHash, adminId, csrfToken, expiresAt }) {
  database.prepare(`
    INSERT INTO admin_sessions (token_hash, admin_id, csrf_token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(tokenHash, adminId, csrfToken, expiresAt, now());
}

function findAdminSession(tokenHash) {
  database.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(now());
  return database.prepare(`
    SELECT s.token_hash AS tokenHash, s.csrf_token AS csrfToken, s.expires_at AS expiresAt,
           a.id AS adminId, a.username
    FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(tokenHash, now());
}

function deleteAdminSession(tokenHash) {
  database.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
}

function getDashboardStats() {
  return {
    guests: database.prepare('SELECT COUNT(*) AS count FROM guests').get().count,
    viewed: database.prepare('SELECT COUNT(*) AS count FROM guests WHERE view_count > 0').get().count,
    attending: database.prepare("SELECT COUNT(*) AS count FROM guests WHERE attendance_status = 'attending'").get().count,
    pendingWishes: database.prepare("SELECT COUNT(*) AS count FROM wishes WHERE status = 'pending'").get().count,
    approvedWishes: database.prepare("SELECT COUNT(*) AS count FROM wishes WHERE status = 'approved'").get().count,
  };
}

function listGuests({ search = '', status = '', attendance = '' } = {}) {
  const conditions = [];
  const parameters = {};
  if (search) {
    conditions.push('(full_name LIKE @search OR slug LIKE @search OR relationship LIKE @search)');
    parameters.search = `%${search}%`;
  }
  if (['active', 'hidden'].includes(status)) {
    conditions.push('status = @status');
    parameters.status = status;
  }
  if (['unconfirmed', 'attending', 'declined'].includes(attendance)) {
    conditions.push('attendance_status = @attendance');
    parameters.attendance = attendance;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return database.prepare(`
    SELECT id, full_name AS fullName, slug, salutation, avatar_url AS avatarUrl,
           relationship, status, attendance_status AS attendanceStatus, party_size AS partySize,
           view_count AS viewCount, last_viewed_at AS lastViewedAt, created_at AS createdAt
    FROM guests ${where} ORDER BY datetime(created_at) DESC, id DESC
  `).all(parameters);
}

function getGuestById(id) {
  return database.prepare(`
    SELECT id, full_name AS fullName, slug, salutation, avatar_url AS avatarUrl,
           relationship, personal_message AS personalMessage, phone, note, status,
           attendance_status AS attendanceStatus, party_size AS partySize,
           view_count AS viewCount, first_viewed_at AS firstViewedAt,
           last_viewed_at AS lastViewedAt, responded_at AS respondedAt,
           created_at AS createdAt, updated_at AS updatedAt
    FROM guests WHERE id = ?
  `).get(id);
}

function getGuestBySlug(slug, { includeHidden = false } = {}) {
  return database.prepare(`
    SELECT id, full_name AS fullName, slug, salutation, avatar_url AS avatarUrl,
           relationship, personal_message AS personalMessage, phone, status,
           attendance_status AS attendanceStatus, party_size AS partySize,
           view_count AS viewCount, first_viewed_at AS firstViewedAt,
           last_viewed_at AS lastViewedAt, responded_at AS respondedAt
    FROM guests WHERE slug = ? COLLATE NOCASE ${includeHidden ? '' : "AND status = 'active'"}
  `).get(slug);
}

function slugExists(slug, exceptId = null) {
  const row = exceptId
    ? database.prepare('SELECT id FROM guests WHERE slug = ? COLLATE NOCASE AND id != ?').get(slug, exceptId)
    : database.prepare('SELECT id FROM guests WHERE slug = ? COLLATE NOCASE').get(slug);
  return Boolean(row);
}

function createGuest(guest) {
  const timestamp = now();
  const result = database.prepare(`
    INSERT INTO guests (full_name, slug, salutation, avatar_url, relationship, personal_message,
      phone, note, status, attendance_status, party_size, created_at, updated_at)
    VALUES (@fullName, @slug, @salutation, @avatarUrl, @relationship, @personalMessage,
      @phone, @note, @status, @attendanceStatus, @partySize, @createdAt, @updatedAt)
  `).run({ ...guest, createdAt: timestamp, updatedAt: timestamp });
  return getGuestById(result.lastInsertRowid);
}

function updateGuest(id, guest) {
  database.prepare(`
    UPDATE guests SET full_name = @fullName, slug = @slug, salutation = @salutation,
      avatar_url = @avatarUrl, relationship = @relationship, personal_message = @personalMessage,
      phone = @phone, note = @note, status = @status, attendance_status = @attendanceStatus,
      party_size = @partySize, updated_at = @updatedAt WHERE id = @id
  `).run({ ...guest, id, updatedAt: now() });
  return getGuestById(id);
}

function deleteGuest(id) {
  return database.prepare('DELETE FROM guests WHERE id = ?').run(id).changes > 0;
}

function recordGuestView(id) {
  const timestamp = now();
  database.prepare(`
    UPDATE guests SET view_count = view_count + 1,
      first_viewed_at = COALESCE(first_viewed_at, ?), last_viewed_at = ? WHERE id = ?
  `).run(timestamp, timestamp, id);
}

const saveGuestResponse = database.transaction(({ guest, attendanceStatus, partySize, message }) => {
  const timestamp = now();
  database.prepare(`
    UPDATE guests SET attendance_status = ?, party_size = ?, responded_at = ?, updated_at = ? WHERE id = ?
  `).run(attendanceStatus, partySize, timestamp, timestamp, guest.id);
  if (message) {
    insertWishStatement.run({ guestName: guest.fullName, message, status: 'approved', guestId: guest.id, createdAt: timestamp, updatedAt: timestamp });
  }
});

function listAdminWishes({ status = '', search = '' } = {}) {
  const conditions = [];
  const parameters = {};
  if (['pending', 'approved', 'rejected'].includes(status)) {
    conditions.push('w.status = @status');
    parameters.status = status;
  }
  if (search) {
    conditions.push('(w.guest_name LIKE @search OR w.message LIKE @search)');
    parameters.search = `%${search}%`;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return database.prepare(`
    SELECT w.id, w.guest_name AS guestName, w.message, w.status,
      w.guest_id AS guestId, w.created_at AS createdAt, g.slug AS guestSlug
    FROM wishes w LEFT JOIN guests g ON g.id = w.guest_id ${where}
    ORDER BY datetime(w.created_at) DESC, w.id DESC
  `).all(parameters);
}

function updateWishStatus(id, status) {
  return database.prepare('UPDATE wishes SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id).changes > 0;
}

function deleteWish(id) {
  return database.prepare('DELETE FROM wishes WHERE id = ?').run(id).changes > 0;
}

module.exports = {
  adminCount, createAdmin, createAdminSession, createGuest, createWish,
  deleteAdminSession, deleteGuest, deleteWish, findAdminByUsername,
  findAdminSession, getDashboardStats, getGuestById, getGuestBySlug,
  likeWish, listAdminWishes, listApprovedWishes, listGuests, recordGuestView,
  saveGuestResponse, slugExists, updateGuest, updateWishStatus,
};
