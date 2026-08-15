document.addEventListener('DOMContentLoaded', () => {
  const dashboard = document.querySelector('.craftsman-dashboard')

  if (!dashboard) {
    return
  }

  const menuToggle = dashboard.querySelector('[data-craftsman-dashboard-menu-toggle]')
  const overlay = dashboard.querySelector('[data-craftsman-dashboard-overlay]')
  const sidebar = dashboard.querySelector('[data-craftsman-dashboard-sidebar]')
  const accountMenu = dashboard.querySelector('[data-craftsman-account-menu]')
  const accountToggle = dashboard.querySelector('[data-craftsman-account-toggle]')
  const accountDropdown = dashboard.querySelector('[data-craftsman-account-dropdown]')
  const mobileBreakpoint = window.matchMedia('(max-width: 797px)')
  let navigationScrollPosition = 0

  function setNavigationOpen(isOpen, restoreFocus = false) {
    if (isOpen) {
      navigationScrollPosition = window.scrollY
      dashboard.style.top = `-${navigationScrollPosition}px`
      dashboard.classList.add('is-navigation-open')
    } else {
      dashboard.classList.remove('is-navigation-open')
      dashboard.style.removeProperty('top')
      document.body.style.overflow = ''
      window.scrollTo(0, navigationScrollPosition)
    }

    menuToggle.setAttribute('aria-expanded', String(isOpen))
    menuToggle.setAttribute(
      'aria-label',
      isOpen ? (isTr ? 'Kontrol paneli menüsünü kapat' : 'Close dashboard navigation') : (isTr ? 'Kontrol paneli menüsünü aç' : 'Open dashboard navigation')
    )

    if (isOpen) {
      sidebar
        .querySelector('.craftsman-dashboard-nav-item.is-active')
        ?.focus({ preventScroll: true })
    } else if (restoreFocus) {
      menuToggle.focus()
    }
  }

  function setAccountMenuOpen(isOpen, { focusFirstAction = false, restoreFocus = false } = {}) {
    accountDropdown.hidden = !isOpen
    accountMenu.classList.toggle('is-open', isOpen)
    accountToggle.setAttribute('aria-expanded', String(isOpen))
    accountToggle.setAttribute(
      'aria-label',
      isOpen ? (isTr ? 'Hesap menüsünü kapat' : 'Close craftsman account menu') : (isTr ? 'Hesap menüsünü aç' : 'Open craftsman account menu')
    )

    if (isOpen && focusFirstAction) {
      accountDropdown.querySelector('a, button')?.focus()
    } else if (!isOpen && restoreFocus) {
      accountToggle.focus()
    }
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = dashboard.classList.contains('is-navigation-open')

    if (!isOpen) {
      setAccountMenuOpen(false)
    }

    setNavigationOpen(!isOpen, isOpen)
  })

  overlay.addEventListener('click', () => setNavigationOpen(false, true))

  accountToggle.addEventListener('click', () => {
    const isOpen = accountToggle.getAttribute('aria-expanded') === 'true'

    if (!isOpen && dashboard.classList.contains('is-navigation-open')) {
      setNavigationOpen(false)
    }

    setAccountMenuOpen(!isOpen, { focusFirstAction: !isOpen })
  })

  document.addEventListener('click', (event) => {
    if (
      accountToggle.getAttribute('aria-expanded') === 'true' &&
      !accountMenu.contains(event.target)
    ) {
      setAccountMenuOpen(false)
    }
  })

  dashboard.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return
    }

    if (accountToggle.getAttribute('aria-expanded') === 'true') {
      event.preventDefault()
      setAccountMenuOpen(false, { restoreFocus: true })
    } else if (dashboard.classList.contains('is-navigation-open')) {
      event.preventDefault()
      setNavigationOpen(false, true)
    }
  })

  mobileBreakpoint.addEventListener('change', (event) => {
    if (!event.matches && dashboard.classList.contains('is-navigation-open')) {
      setNavigationOpen(false)
    }
  })

  hydrateProfile(dashboard)
})

async function hydrateProfile(dashboard) {
  const isTr = document.documentElement.lang === 'tr'
  const name = dashboard.querySelector('[data-craftsman-profile-name]')
  const category = dashboard.querySelector('[data-craftsman-profile-category]')
  const avatar = dashboard.querySelector('[data-craftsman-profile-avatar]')
  const verification = dashboard.querySelector('[data-craftsman-verification]')
  const verificationTitle = dashboard.querySelector('[data-craftsman-verification-title]')
  const verificationCopy = dashboard.querySelector('[data-craftsman-verification-copy]')

  try {
    const response = await fetch('/api/craftsman/profile', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('Craftsman profile request failed')
    }

    const { craftsman } = await response.json()

    if (!craftsman) {
      throw new Error('Craftsman profile is missing')
    }

    const businessName = craftsman.businessName?.trim() || (isTr ? 'Usta Hesabı' : 'Craftsman Account')
    const categoryName = isTr ? (craftsman.category?.nameTr ?? 'Usta hesabı') : (craftsman.category?.nameEn ?? 'Craftsman account')
    const trustLabel = formatLabel(craftsman.trustLevelLabel || 'unverified')

    name.textContent = businessName
    category.textContent = categoryName
    avatar.textContent = getInitials(businessName)
    verification.dataset.status = craftsman.trustLevelLabel || 'unverified'
    verificationTitle.textContent = isTr ? `${trustLabel} Usta` : `${trustLabel} Craftsman`
    verificationCopy.textContent = isTr ? 'Mevcut hesap doğrulama durumunuz.' : 'Your current account verification status.'
  } catch (error) {
    console.error('Failed to load dashboard profile details', error)
    verificationTitle.textContent = isTr ? 'Usta durumu' : 'Craftsman status'
    verificationCopy.textContent = isTr ? 'Hesap detaylarını incelemek için profilinizi açın.' : 'Open your profile to review account details.'
  }
}

function formatLabel(value) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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
