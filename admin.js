document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('full-name');
  const slugInput = document.getElementById('slug');
  let slugEdited = Boolean(slugInput?.value);

  slugInput?.addEventListener('input', () => { slugEdited = true; });
  nameInput?.addEventListener('input', () => {
    if (!slugInput || slugEdited) return;
    slugInput.value = slugify(nameInput.value);
  });

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const url = new URL(button.dataset.copy, window.location.origin).href;
      await navigator.clipboard.writeText(url);
      const original = button.textContent;
      button.textContent = 'Đã chép';
      setTimeout(() => { button.textContent = original; }, 1500);
    });
  });

  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm(form.dataset.confirm)) event.preventDefault();
    });
  });
});

function slugify(value) {
  return value.toLocaleLowerCase('vi-VN').replace(/đ/g, 'd').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
