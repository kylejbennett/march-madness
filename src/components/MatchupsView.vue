<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { espnService } from '../services/espnService'
import { participants } from '../data/participants'
import MatchupCard from './MatchupCard.vue'
import MatchupDetailPanel from './MatchupDetailPanel.vue'

const POLL_INTERVAL_MS = 30_000

const route = useRoute()
const router = useRouter()

const formatDateForInput = (d) => {
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Convert YYYYMMDD query param → YYYY-MM-DD for the date input
const espnDateToInput = (s) => s ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}` : null

const today = new Date()
const selectedDateInput = ref(formatDateForInput(today))
const games = ref([])
const isFetching = ref(false)
const selectedGame = ref(null)

let pollTimer = null

const getParticipantForTeam = (espnId) => {
  return participants.find(p => p.teamIds.map(String).includes(String(espnId)))?.name || null
}

// Silent background refresh — no spinner, panel stays open, selectedGame synced by ID
const silentRefresh = async (dateStr) => {
  if (!dateStr) return
  const espnDateStr = dateStr.replace(/-/g, '')
  const fetchedGames = await espnService.fetchGamesByDate(espnDateStr)
  fetchedGames.sort((a, b) => new Date(a.date) - new Date(b.date))
  games.value = fetchedGames

  // Keep the open panel in sync with the fresh game data
  if (selectedGame.value) {
    const refreshed = fetchedGames.find(g => g.id === selectedGame.value.id)
    if (refreshed) selectedGame.value = refreshed
  }

  // Stop polling once no live games remain
  const hasLive = fetchedGames.some(g => g.status?.type?.state === 'in')
  if (!hasLive) stopPolling()
}

const startPolling = (dateStr) => {
  stopPolling()
  pollTimer = setInterval(() => silentRefresh(dateStr), POLL_INTERVAL_MS)
}

const stopPolling = () => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

const fetchGames = async (dateStr, autoOpenGameId = null) => {
  if (!dateStr) return
  stopPolling()
  isFetching.value = true
  selectedGame.value = null

  const espnDateStr = dateStr.replace(/-/g, '')
  const fetchedGames = await espnService.fetchGamesByDate(espnDateStr)
  fetchedGames.sort((a, b) => new Date(a.date) - new Date(b.date))
  games.value = fetchedGames
  isFetching.value = false

  // Auto-open a specific game if requested (deep-link from Teams view)
  if (autoOpenGameId) {
    const target = fetchedGames.find(g => String(g.id) === String(autoOpenGameId))
    if (target) selectedGame.value = target
    // Clean the query params from the URL without re-navigating
    router.replace({ name: 'Matchups', query: {} })
  }

  // Auto-start polling if any games are currently live
  const hasLive = fetchedGames.some(g => g.status?.type?.state === 'in')
  if (hasLive) startPolling(dateStr)
}

onMounted(() => {
  const dateParam = route.query.date ? espnDateToInput(route.query.date) : null
  const gameId = route.query.gameId || null
  if (dateParam) selectedDateInput.value = dateParam
  fetchGames(selectedDateInput.value, gameId)
})

onUnmounted(() => stopPolling())

watch(selectedDateInput, (newVal) => fetchGames(newVal))

const changeDay = (days) => {
  const d = new Date(selectedDateInput.value + 'T12:00:00')
  d.setDate(d.getDate() + days)
  selectedDateInput.value = formatDateForInput(d)
}
</script>

<template>
  <div class="matchups-container">
    <!-- Date Navigation Header -->
    <header class="date-header glass-panel mx-auto">
      <button @click="changeDay(-1)" class="nav-arrow">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div class="relative flex items-center justify-center group cursor-pointer lg:w-48 overflow-hidden">
        <input 
          type="date" 
          v-model="selectedDateInput"
          class="date-input"
        />
        <svg class="w-5 h-5 text-accent-base absolute right-2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <button @click="changeDay(1)" class="nav-arrow">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </header>

    <!-- Content Area -->
    <div v-if="isFetching" class="flex justify-center items-center py-32">
      <div class="w-12 h-12 border-4 border-accent-base/20 border-t-accent-base rounded-full animate-spin"></div>
    </div>
    
    <div v-else-if="games.length === 0" class="flex flex-col items-center justify-center py-32 text-zinc-500">
      <svg class="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-xl font-medium text-zinc-400">No Matchups Scheduled</p>
      <p class="text-sm mt-2">There are no tournament games on this date.</p>
    </div>

    <div v-else class="matchups-grid">
      <MatchupCard 
        v-for="game in games" 
        :key="game.id" 
        :game="game"
        :get-participant="getParticipantForTeam"
        @select="selectedGame = $event"
      />
    </div>

    <!-- Matchup Detail Panel -->
    <Transition name="fade">
      <MatchupDetailPanel
        v-if="selectedGame"
        :game="selectedGame"
        :get-participant="getParticipantForTeam"
        @close="selectedGame = null"
      />
    </Transition>
  </div>
</template>

<style scoped>
.matchups-container {
  @apply w-full mx-auto flex flex-col gap-6;
}

.glass-panel {
  @apply bg-glass-bg backdrop-blur-md border border-glass-border;
}

.date-header {
  @apply flex items-center justify-between rounded-xl p-2 w-full max-w-sm shadow-xl;
}

.nav-arrow {
  @apply p-2 rounded-lg text-accent-base hover:bg-white/10 transition-colors duration-200 outline-none;
}

.date-input {
  @apply bg-transparent text-lg sm:text-lg font-semibold text-white outline-none cursor-pointer w-full text-center pl-4 pr-8 tracking-wide;
  color-scheme: dark;
}

.date-input::-webkit-calendar-picker-indicator {
  @apply absolute inset-0 w-full h-full opacity-0 cursor-pointer;
}

.matchups-grid {
  @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5;
}
</style>
