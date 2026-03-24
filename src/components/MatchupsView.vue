<script setup>
import { ref, onMounted, watch } from 'vue'
import { espnService } from '../services/espnService'
import { participants } from '../data/participants'
import MatchupCard from './MatchupCard.vue'

const formatDateForInput = (d) => {
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const today = new Date()
const selectedDateInput = ref(formatDateForInput(today))
const games = ref([])
const isFetching = ref(false)

const getParticipantForTeam = (espnId) => {
  return participants.find(p => p.teamIds.map(String).includes(String(espnId)))?.name || null
}

const fetchGames = async (dateStr) => {
  if (!dateStr) return
  isFetching.value = true
  
  const espnDateStr = dateStr.replace(/-/g, '')
  let fetchedGames = await espnService.fetchGamesByDate(espnDateStr)
  
  fetchedGames.sort((a, b) => new Date(a.date) - new Date(b.date))
  
  games.value = fetchedGames
  isFetching.value = false
}

onMounted(() => {
  fetchGames(selectedDateInput.value)
})

watch(selectedDateInput, (newVal) => {
  fetchGames(newVal)
})

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
      />
    </div>
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
