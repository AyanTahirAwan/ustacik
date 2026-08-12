import '../css/confirmation-modal.css'

let modalElements
let activeConfirmation = null

export function confirmAction({
  title = 'Confirm action',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
} = {}) {
  if (activeConfirmation) {
    return Promise.resolve(false)
  }

  const modal = getModalElements()
  const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const previousBodyOverflow = document.body.style.overflow

  modal.title.textContent = title
  modal.description.textContent = message
  modal.confirmButton.textContent = confirmLabel
  modal.cancelButton.textContent = cancelLabel
  modal.root.hidden = false
  document.body.style.overflow = 'hidden'

  return new Promise((resolve) => {
    activeConfirmation = {
      previousBodyOverflow,
      resolve,
      trigger,
    }

    window.requestAnimationFrame(() => {
      if (activeConfirmation) {
        modal.cancelButton.focus()
      }
    })
  })
}

function getModalElements() {
  if (modalElements) {
    return modalElements
  }

  const root = document.createElement('div')
  const dialog = document.createElement('section')
  const title = document.createElement('h2')
  const description = document.createElement('p')
  const actions = document.createElement('div')
  const cancelButton = document.createElement('button')
  const confirmButton = document.createElement('button')

  root.className = 'ustacik-confirmation'
  root.dataset.ustacikConfirmation = ''
  root.hidden = true

  dialog.className = 'ustacik-confirmation__dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-labelledby', 'ustacik-confirmation-title')
  dialog.setAttribute('aria-describedby', 'ustacik-confirmation-description')

  title.id = 'ustacik-confirmation-title'
  title.className = 'ustacik-confirmation__title'

  description.id = 'ustacik-confirmation-description'
  description.className = 'ustacik-confirmation__description'

  actions.className = 'ustacik-confirmation__actions'

  cancelButton.className = 'ustacik-confirmation__button ustacik-confirmation__button--cancel'
  cancelButton.type = 'button'

  confirmButton.className = 'ustacik-confirmation__button ustacik-confirmation__button--confirm'
  confirmButton.type = 'button'

  cancelButton.addEventListener('click', () => settleConfirmation(false))
  confirmButton.addEventListener('click', () => settleConfirmation(true))

  root.addEventListener('click', (event) => {
    if (event.target === root) {
      settleConfirmation(false)
    }
  })

  root.addEventListener('keydown', (event) => {
    if (!activeConfirmation) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      settleConfirmation(false)
      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const firstFocusable = cancelButton
    const lastFocusable = confirmButton

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault()
      lastFocusable.focus()
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault()
      firstFocusable.focus()
    }
  })

  actions.append(cancelButton, confirmButton)
  dialog.append(title, description, actions)
  root.appendChild(dialog)
  document.body.appendChild(root)

  modalElements = {
    cancelButton,
    confirmButton,
    description,
    root,
    title,
  }

  return modalElements
}

function settleConfirmation(confirmed) {
  if (!activeConfirmation) {
    return
  }

  const modal = getModalElements()
  const { previousBodyOverflow, resolve, trigger } = activeConfirmation

  activeConfirmation = null
  modal.root.hidden = true
  document.body.style.overflow = previousBodyOverflow

  if (trigger?.isConnected) {
    trigger.focus()
  }

  resolve(confirmed)
}
