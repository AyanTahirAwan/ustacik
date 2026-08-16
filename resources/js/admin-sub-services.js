import { confirmAction } from './confirmation-modal.js'

const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('admin-sub-services-page')
  if (!page) return

  const loading = document.getElementById('subservices-loading')
  const content = document.getElementById('subservices-content')
  const errorBox = document.getElementById('subservices-error')
  const errorMessage = document.getElementById('subservices-error-message')
  const successBox = document.getElementById('subservices-success')
  const successMessage = document.getElementById('subservices-success-message')
  const tableBody = document.getElementById('subservices-table-body')

  const csrfInput = document.querySelector('#subservices-csrf-form input[name="_csrf"]')
  const csrfToken = csrfInput ? csrfInput.value : ''

  let subServices = []

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

    subServices.forEach((service) => {
      const trRow = document.createElement('tr')
      const catName = isTr
        ? service.category?.nameTr || service.category?.nameEn
        : service.category?.nameEn || service.category?.nameTr

      trRow.innerHTML = `
        <td><strong>#${service.id}</strong></td>
        <td><span class="badge" style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${escapeHtml(catName || `#${service.categoryId}`)}</span></td>
        <td>${escapeHtml(service.nameEn)}</td>
        <td>${escapeHtml(service.nameTr)}</td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <a href="/admin/sub-services/${service.id}/edit" class="btn-back" style="padding: 6px 12px; font-size: 0.9rem; text-decoration: none;">
              ${tr('Edit', 'Düzenle')}
            </a>
            <button type="button" class="btn-delete-subservice" data-id="${service.id}" data-name="${escapeHtml(service.nameEn)}" style="background-color: #dc2626; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-weight: 700; cursor: pointer;">
              ${tr('Delete', 'Sil')}
            </button>
          </div>
        </td>
      `
      tableBody.appendChild(trRow)
    })
  }

  async function loadSubServices() {
    try {
      const response = await fetch('/api/admin/sub-services', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || tr('Failed to load sub-services', 'Alt hizmetler yüklenemedi'))

      subServices = data.subServices || []
      loading.hidden = true
      content.hidden = false
      renderTable()
    } catch (err) {
      loading.hidden = true
      showError(err.message)
    }
  }

  tableBody.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.btn-delete-subservice')
    if (!deleteBtn) return

    const serviceId = deleteBtn.dataset.id
    const serviceName = deleteBtn.dataset.name

    const confirmed = await confirmAction({
      title: tr('Delete sub-service?', 'Alt hizmet silinsin mi?'),
      message: isTr
        ? `"${serviceName}" hizmetini silmek istediğinize emin misiniz?`
        : `Are you sure you want to delete the sub-service "${serviceName}"?`,
      confirmLabel: tr('Delete Sub-Service', 'Alt Hizmeti Sil'),
      cancelLabel: tr('Cancel', 'İptal'),
    })

    if (!confirmed) return

    deleteBtn.disabled = true
    try {
      const res = await fetch(`/api/admin/sub-services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'same-origin',
      })

      if (res.status === 409) {
        const conflictData = await res.json().catch(() => ({}))
        throw new Error(conflictData.message || tr('Cannot delete referenced sub-service.', 'Kullanımda olan alt hizmet silinemez.'))
      }

      if (!res.ok) throw new Error(tr('Failed to delete sub-service.', 'Alt hizmet silinemedi.'))

      showSuccess(
        isTr
          ? `"${serviceName}" hizmeti başarıyla silindi.`
          : `Sub-service "${serviceName}" deleted successfully.`
      )
      subServices = subServices.filter((s) => String(s.id) !== String(serviceId))
      renderTable()
    } catch (err) {
      showError(err.message)
      deleteBtn.disabled = false
    }
  })

  loadSubServices()
})
