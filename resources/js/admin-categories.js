import { confirmAction } from './confirmation-modal.js'

const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('admin-categories-page')
  if (!page) return

  const loading = document.getElementById('categories-loading')
  const content = document.getElementById('categories-content')
  const errorBox = document.getElementById('categories-error')
  const errorMessage = document.getElementById('categories-error-message')
  const successBox = document.getElementById('categories-success')
  const successMessage = document.getElementById('categories-success-message')
  const tableBody = document.getElementById('categories-table-body')

  const csrfInput = document.querySelector('#categories-csrf-form input[name="_csrf"]')
  const csrfToken = csrfInput ? csrfInput.value : ''

  let categories = []

  function escapeHtml(text) {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  function showSuccess(msg) {
    successMessage.textContent = msg
    successBox.hidden = false
    errorBox.hidden = true
  }

  function showError(msg) {
    errorMessage.textContent = msg
    errorBox.hidden = false
    successBox.hidden = true
  }

  function renderTable() {
    tableBody.replaceChildren()

    categories.forEach((category) => {
      const trRow = document.createElement('tr')
      const subCount = category.$extras?.subServices_count ?? (category.subServices ? category.subServices.length : 0)

      trRow.innerHTML = `
        <td><strong>#${category.id}</strong></td>
        <td>${escapeHtml(category.nameEn)}</td>
        <td>${escapeHtml(category.nameTr)}</td>
        <td><span class="badge" style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${subCount} ${tr('services', 'hizmet')}</span></td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <a href="/admin/categories/${category.id}/edit" class="btn-back" style="padding: 6px 12px; font-size: 0.9rem; text-decoration: none;">
              ${tr('Edit', 'Düzenle')}
            </a>
            <button type="button" class="btn-delete-category" data-id="${category.id}" data-name="${escapeHtml(category.nameEn)}" style="background-color: #dc2626; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-weight: 700; cursor: pointer;">
              ${tr('Delete', 'Sil')}
            </button>
          </div>
        </td>
      `
      tableBody.appendChild(trRow)
    })
  }

  async function loadCategories() {
    try {
      const response = await fetch('/api/admin/categories', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || tr('Failed to load categories', 'Kategoriler yüklenemedi'))

      categories = data.categories || []
      loading.hidden = true
      content.hidden = false
      renderTable()
    } catch (err) {
      loading.hidden = true
      showError(err.message)
    }
  }

  tableBody.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.btn-delete-category')
    if (!deleteBtn) return

    const categoryId = deleteBtn.dataset.id
    const categoryName = deleteBtn.dataset.name

    const confirmed = await confirmAction({
      title: tr('Delete category?', 'Kategori silinsin mi?'),
      message: isTr
        ? `"${categoryName}" kategorisini silmek istediğinize emin misiniz?`
        : `Are you sure you want to delete the category "${categoryName}"?`,
      confirmLabel: tr('Delete Category', 'Kategoriyi Sil'),
      cancelLabel: tr('Cancel', 'İptal'),
    })

    if (!confirmed) return

    deleteBtn.disabled = true
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'same-origin',
      })

      if (res.status === 409) {
        const conflictData = await res.json().catch(() => ({}))
        throw new Error(conflictData.message || tr('Cannot delete referenced category.', 'Kullanımda olan kategori silinemez.'))
      }

      if (!res.ok) throw new Error(tr('Failed to delete category.', 'Kategori silinemedi.'))

      showSuccess(
        isTr
          ? `"${categoryName}" kategorisi başarıyla silindi.`
          : `Category "${categoryName}" deleted successfully.`
      )
      categories = categories.filter((c) => String(c.id) !== String(categoryId))
      renderTable()
    } catch (err) {
      showError(err.message)
      deleteBtn.disabled = false
    }
  })

  loadCategories()
})
