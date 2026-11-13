const SEASONS_BASE_URL = (import.meta.env.VITE_SEASONS_BASE_URL || '').replace(/\/+$/, '')
const POOL_API_URL = (import.meta.env.VITE_POOL_API_URL || '').replace(/\/+$/, '')
const POOL_API_KEY = import.meta.env.VITE_POOL_API_KEY || ''

export const seasonService = {
  isRemoteReadEnabled() {
    return Boolean(SEASONS_BASE_URL)
  },

  isRemoteWriteEnabled() {
    return Boolean(POOL_API_URL && POOL_API_KEY)
  },

  async fetchSeasonIndex() {
    if (!SEASONS_BASE_URL) return null

    try {
      const res = await fetch(`${SEASONS_BASE_URL}/index.json`, { cache: 'no-store' })
      if (!res.ok) return null
      const data = await res.json()
      return Array.isArray(data?.seasons) ? data.seasons : null
    } catch (err) {
      console.warn('Could not load remote season index from S3:', err)
      return null
    }
  },

  async fetchSeasonData(year) {
    if (!SEASONS_BASE_URL) return null

    try {
      const res = await fetch(`${SEASONS_BASE_URL}/${year}.json`, { cache: 'no-store' })
      if (!res.ok) return null
      const data = await res.json()
      return data && typeof data === 'object' ? data : null
    } catch (err) {
      console.warn(`Could not load remote season ${year} from S3:`, err)
      return null
    }
  },

  async saveSeasonData(year, seasonData, adminPassword) {
    if (!POOL_API_URL || !POOL_API_KEY) {
      throw new Error('Missing VITE_POOL_API_URL or VITE_POOL_API_KEY environment variables.')
    }
    if (!adminPassword) {
      throw new Error('Admin password is required to save changes.')
    }

    const res = await fetch(`${POOL_API_URL}/seasons/${year}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': POOL_API_KEY,
        'x-admin-password': adminPassword,
      },
      body: JSON.stringify(seasonData),
    })

    if (!res.ok) {
      let message = `Failed to save season ${year} (${res.status})`
      try {
        const errBody = await res.json()
        if (errBody?.error || errBody?.message) {
          message = errBody.error || errBody.message
        }
      } catch {
        // ignore non-JSON error body
      }
      throw new Error(message)
    }

    return res.json()
  },
}
