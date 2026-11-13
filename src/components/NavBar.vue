<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useSeason } from '../composables/useSeason'

const route = useRoute()
const router = useRouter()
const { selectedYear, availableSeasons, setSeason } = useSeason()

const tabs = ['Overview', 'Matchups', 'Bracket', 'Teams', 'Draft']

const navigate = (tab) => {
  router.push({ name: tab })
}

const handleSeasonChange = (event) => {
  const year = Number(event.target.value)
  if (year === selectedYear.value) return
  setSeason(year)
  // Clear season-specific query params (e.g. date, gameId, teamId) on season switch
  if (Object.keys(route.query).length > 0) {
    router.replace({ name: route.name, query: {} })
  }
}
</script>

<template>
  <nav class="pool-nav">
    <div class="nav-container">
      <h2 class="mobile-logo sm:hidden">8TP</h2>
      
      <div class="tabs-wrapper">
        <button 
          v-for="tab in tabs" 
          :key="tab"
          class="nav-tab"
          :class="{ 'active-tab': route.name === tab }"
          @click="navigate(tab)"
        >
          {{ tab }}
        </button>
      </div>

      <div class="season-select-wrapper">
        <select
          :value="selectedYear"
          aria-label="Tournament Season"
          class="season-select"
          @change="handleSeasonChange"
        >
          <option
            v-for="s in availableSeasons"
            :key="s.year"
            :value="s.year"
            class="bg-zinc-900 text-zinc-100"
          >
            {{ s.label }}{{ s.status === 'upcoming' ? ' (Upcoming)' : '' }}
          </option>
        </select>
        <svg class="season-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.pool-nav {
  @apply sticky top-0 z-50 w-full bg-[#09090b]/80 backdrop-blur-xl border-b border-glass-border;
}

.nav-container {
  @apply max-w-[1800px] mx-auto flex items-center px-4 py-3;
}

.mobile-logo {
  @apply text-accent-base font-bold text-xl mr-4;
}

.tabs-wrapper {
  @apply grid grid-cols-5 sm:flex sm:items-center sm:justify-center w-full flex-1 gap-1 sm:gap-6;
}

.nav-tab {
  @apply text-center px-1 sm:px-4 py-2 sm:rounded-full rounded-md text-[0.7rem] sm:text-base text-zinc-400 font-medium sm:tracking-wider transition-all duration-200 hover:text-zinc-200 hover:bg-white/5 outline-none;
}

.active-tab {
  @apply bg-accent-base/10 text-accent-base shadow-[inset_0_0_20px_rgba(147,51,234,0.15)] ring-1 ring-accent-base/30;
}

.season-select-wrapper {
  @apply relative ml-2 sm:ml-4 flex items-center flex-shrink-0;
}

.season-select {
  @apply appearance-none bg-black/50 border border-glass-border rounded-full pl-3 sm:pl-4 pr-7 sm:pr-8 py-1.5 text-xs sm:text-sm font-bold tracking-wider text-zinc-200 cursor-pointer transition-all hover:border-accent-base/50 focus:outline-none focus:ring-1 focus:ring-accent-base;
}

.season-chevron {
  @apply pointer-events-none absolute right-2.5 w-3.5 h-3.5 text-zinc-400;
}
</style>
