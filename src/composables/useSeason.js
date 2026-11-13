import { ref, computed } from 'vue'
import { seasons as bundledSeasons, getSeason as getBundledSeason, DEFAULT_SEASON_YEAR } from '../data/seasons'
import { seasonService } from '../services/seasonService'

const selectedYear = ref(DEFAULT_SEASON_YEAR)
const seasonMap = ref(
  Object.fromEntries(bundledSeasons.map(s => [s.year, s]))
)
const availableSeasons = ref(
  bundledSeasons.map(s => ({
    year: s.year,
    label: s.label,
    status: s.status,
    hasTeams: s.teams.length > 0,
  }))
)
const isLoadingSeason = ref(false)
let initialized = false

async function hydrateSeason(year) {
  const numYear = Number(year)
  isLoadingSeason.value = true
  try {
    const remote = await seasonService.fetchSeasonData(numYear)
    if (remote) {
      const fallback = getBundledSeason(numYear)
      seasonMap.value = {
        ...seasonMap.value,
        [numYear]: {
          ...fallback,
          ...remote,
          year: numYear,
          teams: Array.isArray(remote.teams) ? remote.teams : (fallback?.teams || []),
          participants: Array.isArray(remote.participants) ? remote.participants : (fallback?.participants || []),
        },
      }
    }
  } finally {
    isLoadingSeason.value = false
  }
}

export function useSeason() {
  const currentSeason = computed(() => {
    return seasonMap.value[selectedYear.value] || getBundledSeason(selectedYear.value)
  })

  const historicalParticipantNames = computed(() => {
    const names = new Set()
    Object.values(seasonMap.value).forEach(season => {
      ;(season?.participants || []).forEach(p => {
        const trimmed = p?.name?.trim()
        if (trimmed) names.add(trimmed)
      })
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  })

  const isSeasonReady = computed(() => (currentSeason.value?.teams?.length || 0) > 0)

  const initSeasons = async () => {
    if (initialized) return
    initialized = true

    const remoteIndex = await seasonService.fetchSeasonIndex()
    if (remoteIndex && remoteIndex.length > 0) {
      const merged = new Map()
      bundledSeasons.forEach(s => {
        merged.set(s.year, {
          year: s.year,
          label: s.label,
          status: s.status,
          hasTeams: s.teams.length > 0,
        })
      })
      remoteIndex.forEach(s => {
        merged.set(Number(s.year), {
          year: Number(s.year),
          label: s.label || String(s.year),
          status: s.status || 'upcoming',
          hasTeams: Boolean(s.hasTeams),
        })
      })
      availableSeasons.value = Array.from(merged.values()).sort((a, b) => b.year - a.year)

      // Default to newest season with teams if available
      const defaultRemote = availableSeasons.value.find(s => s.hasTeams)
      if (defaultRemote) {
        selectedYear.value = defaultRemote.year
      }
    }

    await hydrateSeason(selectedYear.value)
  }

  const setSeason = async (year) => {
    const numYear = Number(year)
    if (!numYear) return
    selectedYear.value = numYear
    await hydrateSeason(numYear)
  }

  const saveSeason = async (seasonPayload, adminPassword) => {
    const numYear = Number(seasonPayload.year)
    await seasonService.saveSeasonData(numYear, seasonPayload, adminPassword)

    const updatedStatus =
      seasonPayload.status ||
      (Array.isArray(seasonPayload.teams) && seasonPayload.teams.length > 0 ? 'active' : 'upcoming')

    const normalized = {
      ...seasonPayload,
      year: numYear,
      status: updatedStatus,
    }

    seasonMap.value = {
      ...seasonMap.value,
      [numYear]: normalized,
    }

    const summary = {
      year: numYear,
      label: normalized.label || String(numYear),
      status: updatedStatus,
      hasTeams: Array.isArray(normalized.teams) && normalized.teams.length > 0,
    }

    const idx = availableSeasons.value.findIndex(s => s.year === numYear)
    const nextList = [...availableSeasons.value]
    if (idx >= 0) {
      nextList[idx] = summary
    } else {
      nextList.push(summary)
      nextList.sort((a, b) => b.year - a.year)
    }
    availableSeasons.value = nextList
  }

  return {
    selectedYear,
    currentSeason,
    historicalParticipantNames,
    isSeasonReady,
    isLoadingSeason,
    availableSeasons,
    isRemoteWriteEnabled: seasonService.isRemoteWriteEnabled(),
    initSeasons,
    setSeason,
    saveSeason,
  }
}
