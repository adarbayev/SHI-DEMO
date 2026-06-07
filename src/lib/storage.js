const STORAGE_KEY = 'shi-decarbonisation-sandbox-state'

export function loadStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveStoredState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Persistence should never block the UI.
  }
}

export function clearStoredState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage availability issues in locked-down browsers.
  }
}
