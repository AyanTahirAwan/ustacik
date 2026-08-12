document.addEventListener('DOMContentLoaded', () => {
  const account = document.querySelector('.customer-account')

  if (!account) {
    return
  }

  const menuToggle = account.querySelector('[data-customer-account-menu-toggle]')
  const overlay = account.querySelector('[data-customer-account-overlay]')
  const sidebar = account.querySelector('[data-customer-account-sidebar]')
  const accountControl = account.querySelector('[data-customer-account-control]')
  const accountToggle = account.querySelector('[data-customer-account-toggle]')
  const accountDropdown = account.querySelector('[data-customer-account-dropdown]')
  const mobileBreakpoint = window.matchMedia('(max-width: 797px)')
  let navigationScrollPosition = 0

  function setNavigationOpen(isOpen, restoreFocus = false) {
    if (isOpen) {
      navigationScrollPosition = window.scrollY
      account.style.top = `-${navigationScrollPosition}px`
      account.classList.add('is-navigation-open')
    } else {
      const wasOpen = account.classList.contains('is-navigation-open')

      account.classList.remove('is-navigation-open')
      account.style.removeProperty('top')

      if (wasOpen) {
        window.scrollTo(0, navigationScrollPosition)
      }
    }

    menuToggle.setAttribute('aria-expanded', String(isOpen))
    menuToggle.setAttribute(
      'aria-label',
      isOpen ? 'Close customer navigation' : 'Open customer navigation'
    )

    if (isOpen) {
      sidebar.querySelector('.customer-account-nav-item.is-active')?.focus({ preventScroll: true })
    } else if (restoreFocus) {
      menuToggle.focus()
    }
  }

  function setAccountMenuOpen(isOpen, { focusFirstAction = false, restoreFocus = false } = {}) {
    accountDropdown.hidden = !isOpen
    accountControl.classList.toggle('is-open', isOpen)
    accountToggle.setAttribute('aria-expanded', String(isOpen))
    accountToggle.setAttribute(
      'aria-label',
      isOpen ? 'Close customer account menu' : 'Open customer account menu'
    )

    if (isOpen && focusFirstAction) {
      accountDropdown.querySelector('button')?.focus()
    } else if (!isOpen && restoreFocus) {
      accountToggle.focus()
    }
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = account.classList.contains('is-navigation-open')

    if (!isOpen) {
      setAccountMenuOpen(false)
    }

    setNavigationOpen(!isOpen, isOpen)
  })

  overlay.addEventListener('click', () => setNavigationOpen(false, true))

  sidebar.addEventListener('click', (event) => {
    if (mobileBreakpoint.matches && event.target.closest('a')) {
      setNavigationOpen(false)
    }
  })

  accountToggle.addEventListener('click', () => {
    const isOpen = accountToggle.getAttribute('aria-expanded') === 'true'

    if (!isOpen && account.classList.contains('is-navigation-open')) {
      setNavigationOpen(false)
    }

    setAccountMenuOpen(!isOpen, { focusFirstAction: !isOpen })
  })

  document.addEventListener('click', (event) => {
    if (
      accountToggle.getAttribute('aria-expanded') === 'true' &&
      !accountControl.contains(event.target)
    ) {
      setAccountMenuOpen(false)
    }
  })

  account.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return
    }

    if (accountToggle.getAttribute('aria-expanded') === 'true') {
      event.preventDefault()
      setAccountMenuOpen(false, { restoreFocus: true })
    } else if (account.classList.contains('is-navigation-open')) {
      event.preventDefault()
      setNavigationOpen(false, true)
    }
  })

  mobileBreakpoint.addEventListener('change', (event) => {
    if (!event.matches && account.classList.contains('is-navigation-open')) {
      setNavigationOpen(false)
    }
  })

  void hydrateCustomerIdentity(account)
})

async function hydrateCustomerIdentity(account) {
  const name = account.querySelector('[data-customer-account-name]')
  const email = account.querySelector('[data-customer-account-email]')
  const avatar = account.querySelector('[data-customer-account-avatar]')

  try {
    const response = await fetch('/api/customer/profile', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('Customer profile request failed')
    }

    const { customer } = await response.json()

    if (!customer) {
      throw new Error('Customer profile is missing')
    }

    const fullName = customer.fullName?.trim() || customer.user?.email || 'Customer Account'
    const emailAddress = customer.user?.email || 'Customer account'

    name.textContent = fullName
    email.textContent = emailAddress
    avatar.textContent = getInitials(fullName)
  } catch (error) {
    console.error('Failed to load customer account identity', error)
  }
}

function getInitials(value) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return initials || 'UC'
}
