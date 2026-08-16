import { confirmAction } from './confirmation-modal.js'

const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('admin-verifications-page')
  if (!page) return

  const loading = document.getElementById('verifications-loading')
  const content = document.getElementById('verifications-content')
  const errorBox = document.getElementById('verifications-error')
  const errorMessage = document.getElementById('verifications-error-message')
  const successBox = document.getElementById('verifications-success')
  const successMessage = document.getElementById('verifications-success-message')
  const emptyState = document.getElementById('verifications-empty')
  const tableBody = document.getElementById('verifications-table-body')
  const countBadge = document.getElementById('verifications-count')

  const photoModal = document.getElementById('id-photo-modal')
  const modalImg = document.getElementById('modal-photo-img')
  const modalName = document.getElementById('modal-craftsman-name')
  const modalClose = document.getElementById('modal-close-btn')

  const csrfInput = document.querySelector('#verifications-csrf-form input[name="_csrf"]')
  const csrfToken = csrfInput ? csrfInput.value : ''

  let craftsmenList = []

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

  function openPhotoModal(imageUrl, name) {
    modalImg.src = imageUrl
    modalName.textContent = name || tr('Craftsman ID Document', 'Usta Kimlik Belgesi')
    photoModal.hidden = false
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      photoModal.hidden = true
    })
  }

  if (photoModal) {
    photoModal.addEventListener('click', (e) => {
      if (e.target === photoModal) photoModal.hidden = true
    })
  }

  function renderTable() {
    tableBody.replaceChildren()

    const pendingList = craftsmenList.filter((c) => (c.verificationStatus || 'pending') === 'pending')
    countBadge.textContent = `${pendingList.length} ${tr('Pending', 'Bekleyen')}`

    if (craftsmenList.length === 0) {
      emptyState.hidden = false
      return
    }

    emptyState.hidden = true

    craftsmenList.forEach((craftsman) => {
      const trRow = document.createElement('tr')
      const status = craftsman.verificationStatus || 'pending'
      const statusBadgeClass =
        status === 'approved' ? 'status-active' : status === 'rejected' ? 'status-dispute' : 'status-pending'
      const statusLabel =
        status === 'approved'
          ? tr('Approved', 'Onaylı')
          : status === 'rejected'
            ? tr('Rejected', 'Reddedildi')
            : tr('Pending', 'Beklemede')

      const categoryName = isTr
        ? craftsman.category?.nameTr || craftsman.category?.nameEn
        : craftsman.category?.nameEn || craftsman.category?.nameTr

      const idPhotoHtml = craftsman.idCardImageUrl
        ? `<button type="button" class="btn-id-preview" data-img-url="${escapeHtml(craftsman.idCardImageUrl)}" data-biz-name="${escapeHtml(craftsman.businessName)}" style="background: none; border: 1px solid var(--brand-brown); border-radius: 6px; padding: 4px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: var(--brand-brown);">
            <img src="${escapeHtml(craftsman.idCardImageUrl)}" alt="ID" style="width: 28px; height: 20px; object-fit: cover; border-radius: 3px;" />
            <span>${tr('View ID', 'Kimliği Gör')}</span>
          </button>`
        : `<span style="color: #999;">${tr('No Photo', 'Fotoğraf Yok')}</span>`

      const actionsHtml =
        status === 'pending'
          ? `<div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button type="button" class="btn-approve-craftsman" data-id="${craftsman.userId}" style="background-color: #059669; color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-weight: 700; cursor: pointer;">
                ${tr('Approve', 'Onayla')}
              </button>
              <button type="button" class="btn-reject-craftsman" data-id="${craftsman.userId}" style="background-color: #dc2626; color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-weight: 700; cursor: pointer;">
                ${tr('Reject', 'Reddet')}
              </button>
            </div>`
          : `<div style="text-align: right; color: #777; font-size: 0.9rem;">
              ${status === 'approved' ? tr('Verified', 'Doğrulandı') : tr('Rejected', 'Reddedildi')}
            </div>`

      trRow.innerHTML = `
        <td><strong>${escapeHtml(craftsman.businessName)}</strong></td>
        <td>
          <div>${escapeHtml(craftsman.user?.email || '—')}</div>
          <small style="color: #666;">${escapeHtml(craftsman.user?.phoneNormalised || '')}</small>
        </td>
        <td>${escapeHtml(categoryName || '—')}</td>
        <td>${idPhotoHtml}</td>
        <td><span class="status-badge ${statusBadgeClass}">${statusLabel}</span></td>
        <td>${actionsHtml}</td>
      `

      tableBody.appendChild(trRow)
    })
  }

  async function loadVerifications() {
    try {
      const response = await fetch('/api/admin/verifications', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || tr('Failed to load verifications', 'Doğrulamalar yüklenemedi'))

      craftsmenList = data.craftsmen || []
      loading.hidden = true
      content.hidden = false
      renderTable()
    } catch (err) {
      loading.hidden = true
      showError(err.message)
    }
  }

  tableBody.addEventListener('click', async (e) => {
    const previewBtn = e.target.closest('.btn-id-preview')
    if (previewBtn) {
      openPhotoModal(previewBtn.dataset.imgUrl, previewBtn.dataset.bizName)
      return
    }

    const approveBtn = e.target.closest('.btn-approve-craftsman')
    if (approveBtn) {
      const craftsmanId = approveBtn.dataset.id
      const craftsman = craftsmenList.find((c) => String(c.userId) === String(craftsmanId))
      const name = craftsman ? craftsman.businessName : 'Craftsman'

      const confirmed = await confirmAction({
        title: tr('Approve craftsman verification?', 'Usta doğrulaması onaylansın mı?'),
        message: isTr
          ? `"${name}" işletmesinin kimlik belgelerini onaylamak ve hesabı aktif etmek istediğinize emin misiniz?`
          : `Are you sure you want to approve "${name}" and activate their account?`,
        confirmLabel: tr('Approve Account', 'Hesabı Onayla'),
        cancelLabel: tr('Cancel', 'İptal'),
      })

      if (!confirmed) return

      approveBtn.disabled = true
      try {
        const res = await fetch(`/api/admin/craftsmen/${craftsmanId}/verify/approve`, {
          method: 'PATCH',
          headers: {
            'Accept': 'application/json',
            'x-csrf-token': csrfToken,
          },
          credentials: 'same-origin',
        })
        const resData = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(resData.message || 'Approval failed')

        showSuccess(
          isTr
            ? `"${name}" başarıyla onaylandı ve hesabı aktif edildi.`
            : `"${name}" has been approved and activated.`
        )
        if (craftsman) craftsman.verificationStatus = 'approved'
        renderTable()
      } catch (err) {
        showError(err.message)
        approveBtn.disabled = false
      }
      return
    }

    const rejectBtn = e.target.closest('.btn-reject-craftsman')
    if (rejectBtn) {
      const craftsmanId = rejectBtn.dataset.id
      const craftsman = craftsmenList.find((c) => String(c.userId) === String(craftsmanId))
      const name = craftsman ? craftsman.businessName : 'Craftsman'

      const confirmed = await confirmAction({
        title: tr('Reject craftsman verification?', 'Usta doğrulaması reddedilsin mi?'),
        message: isTr
          ? `"${name}" işletmesinin başvurusunu reddetmek ve hesabı askıya almak istediğinize emin misiniz?`
          : `Are you sure you want to reject "${name}" and suspend their account?`,
        confirmLabel: tr('Reject & Suspend', 'Reddet ve Askıya Al'),
        cancelLabel: tr('Cancel', 'İptal'),
      })

      if (!confirmed) return

      rejectBtn.disabled = true
      try {
        const res = await fetch(`/api/admin/craftsmen/${craftsmanId}/verify/reject`, {
          method: 'PATCH',
          headers: {
            'Accept': 'application/json',
            'x-csrf-token': csrfToken,
          },
          credentials: 'same-origin',
        })
        const resData = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(resData.message || 'Rejection failed')

        showSuccess(
          isTr
            ? `"${name}" başvurusu reddedildi ve hesap askıya alındı.`
            : `"${name}" has been rejected and suspended.`
        )
        if (craftsman) craftsman.verificationStatus = 'rejected'
        renderTable()
      } catch (err) {
        showError(err.message)
        rejectBtn.disabled = false
      }
    }
  })

  loadVerifications()
})
