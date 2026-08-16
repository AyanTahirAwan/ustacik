import { confirmAction } from './confirmation-modal.js'

const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('admin-regions-page')
  if (!page) return

  const loading = document.getElementById('regions-loading')
  const content = document.getElementById('regions-content')
  const errorBox = document.getElementById('regions-error')
  const errorMessage = document.getElementById('regions-error-message')
  const successBox = document.getElementById('regions-success')
  const successMessage = document.getElementById('regions-success-message')
  const tableBody = document.getElementById('regions-table-body')

  const csrfInput = document.querySelector('#regions-csrf-form input[name="_csrf"]')
  const csrfToken = csrfInput ? csrfInput.value : ''

  let regions = []

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

    regions.forEach((region) => {
      const trRow = document.createElement('tr')

      trRow.innerHTML = `
        <td><strong>#${region.id}</strong></td>
        <td>${escapeHtml(region.nameEn)}</td>
        <td>${escapeHtml(region.nameTr)}</td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <a href="/admin/regions/${region.id}/edit" class="btn-back" style="padding: 6px 12px; font-size: 0.9rem; text-decoration: none;">
              ${tr('Edit', 'Düzenle')}
            </a>
            <button type="button" class="btn-delete-region" data-id="${region.id}" data-name="${escapeHtml(region.nameEn)}" style="background-color: #dc2626; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-weight: 700; cursor: pointer;">
              ${tr('Delete', 'Sil')}
            </button>
          </div>
        </td>
      `
      tableBody.appendChild(trRow)
    })
  }

  async function loadRegions() {
    try {
      const response = await fetch('/api/admin/regions', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || tr('Failed to load regions', 'Bölgeler yüklenemedi'))

      regions = data.regions || []
      loading.hidden = true
      content.hidden = false
      renderTable()
    } catch (err) {
      loading.hidden = true
      showError(err.message)
    }
  }

  tableBody.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.btn-delete-region')
    if (!deleteBtn) return

    const regionId = deleteBtn.dataset.id
    const regionName = deleteBtn.dataset.name

    const confirmed = await confirmAction({
      title: tr('Delete region?', 'Bölge silinsin mi?'),
      message: isTr
        ? `"${regionName}" bölgesini silmek istediğinize emin misiniz?`
        : `Are you sure you want to delete the region "${regionName}"?`,
      confirmLabel: tr('Delete Region', 'Bölgeyi Sil'),
      cancelLabel: tr('Cancel', 'İptal'),
    })

    if (!confirmed) return

    deleteBtn.disabled = true
    try {
      const res = await fetch(`/api/admin/regions/${regionId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'same-origin',
      })

      if (res.status === 409) {
        const conflictData = await res.json().catch(() => ({}))
        throw new Error(conflictData.message || tr('Cannot delete referenced region.', 'Kullanımda olan bölge silinemez.'))
      }

      if (!res.ok) throw new Error(tr('Failed to delete region.', 'Bölge silinemedi.'))

      showSuccess(
        isTr
          ? `"${regionName}" bölgesi başarıyla silindi.`
          : `Region "${regionName}" deleted successfully.`
      )
      regions = regions.filter((r) => String(r.id) !== String(regionId))
      renderTable()
    } catch (err) {
      showError(err.message)
      deleteBtn.disabled = false
    }
  })

  loadRegions()
})
