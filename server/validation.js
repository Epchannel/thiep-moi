const RESERVED_SLUGS = new Set([
  'admin', 'api', 'login', 'logout', 'setup', 'assets', 'server', 'data',
  'index', 'favicon', 'robots', 'sitemap', 'health',
]);

function clean(value, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function slugify(value) {
  return clean(value, 120).toLocaleLowerCase('vi-VN').replace(/đ/g, 'd').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function validateGuest(body, { slugExists, currentId = null } = {}) {
  const guest = {
    fullName: clean(body.fullName, 100), slug: slugify(body.slug || body.fullName),
    salutation: clean(body.salutation, 30), avatarUrl: clean(body.avatarUrl, 2048),
    relationship: clean(body.relationship, 80), personalMessage: clean(body.personalMessage, 1000),
    phone: clean(body.phone, 30), note: clean(body.note, 1000),
    status: body.status === 'hidden' ? 'hidden' : 'active',
    attendanceStatus: ['attending', 'declined'].includes(body.attendanceStatus) ? body.attendanceStatus : 'unconfirmed',
    partySize: Math.min(Math.max(Number.parseInt(body.partySize, 10) || 1, 1), 20),
  };
  const errors = [];
  if (!guest.fullName) errors.push('Họ tên khách mời là bắt buộc.');
  if (!guest.slug) errors.push('Slug không hợp lệ.');
  if (RESERVED_SLUGS.has(guest.slug)) errors.push('Slug này được dành riêng cho hệ thống.');
  if (guest.slug && slugExists?.(guest.slug, currentId)) errors.push('Slug đã được sử dụng.');
  if (guest.avatarUrl) {
    if (!guest.avatarUrl.startsWith('/uploads/avatars/')) {
      try {
        if (!['http:', 'https:'].includes(new URL(guest.avatarUrl).protocol)) errors.push('Avatar phải là URL http hoặc https.');
      } catch { errors.push('URL avatar không hợp lệ.'); }
    }
  }
  return { guest, errors };
}

module.exports = { clean, RESERVED_SLUGS, slugify, validateGuest };
