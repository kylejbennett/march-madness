<script setup>
import { ref, onMounted, computed } from 'vue'
import { espnService } from '../services/espnService'
import { teams as initialTeams } from '../data/teams'
import { participants as initialParticipants } from '../data/participants'
import ParticipantCard from '../components/ParticipantCard.vue'

const teams = ref([...initialTeams])
const participants = ref([...initialParticipants])
const isFetching = ref(true)
const sortMode = ref('draft') // 'draft' or 'rank'

onMounted(async () => {
  isFetching.value = true
  await espnService.updateTeamsWithLiveStats(teams.value)
  
  participants.value.forEach(p => {
    p.totalWins = p.teamIds.reduce((sum, espnId) => {
      const team = teams.value.find(t => t.espnId === espnId)
      return sum + (team ? team.wins : 0)
    }, 0)
    
    p.teams = p.teamIds.map(espnId => teams.value.find(t => t.espnId === espnId)).filter(Boolean)
  })
  
  isFetching.value = false
})

const participantRanks = computed(() => {
  if (isFetching.value) return {}
  const sorted = [...participants.value].sort((a, b) => b.totalWins - a.totalWins)
  const ranks = {}
  
  let currentRank = 1
  let previousWins = -1
  
  sorted.forEach((p, index) => {
    if (p.totalWins !== previousWins) {
      currentRank = index + 1
      previousWins = p.totalWins
    }
    ranks[p.id] = currentRank
  })
  return ranks
})

const sortedParticipants = computed(() => {
   if (sortMode.value === 'draft') return participants.value;
   return [...participants.value].sort((a, b) => (b.totalWins || 0) - (a.totalWins || 0))
})

const getRankClass = (rank) => {
  if (isFetching.value || !rank) return ''
  if (rank === 1) return 'rank-1'
  if (rank === 2) return 'rank-2'
  if (rank === 3) return 'rank-3'
  return ''
}
</script>

<template>
  <div class="wrapper animate-fade-in max-w-[1400px] mx-auto min-h-screen pb-12">
    
    <!-- Action Header -->
    <div class="mb-10 flex flex-col md:flex-row md:items-center justify-end gap-6 px-4 md:px-0">
      <div class="bg-black/50 p-1 rounded-full flex border border-glass-border w-max shadow-xl overflow-hidden relative z-10">
        <button 
          @click="sortMode = 'draft'" 
          class="px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap"
          :class="sortMode === 'draft' ? 'bg-accent-base text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'"
        >Draft Order</button>
        <button 
          @click="sortMode = 'rank'" 
          class="px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap"
          :class="sortMode === 'rank' ? 'bg-accent-base text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'"
        >Live Rank</button>
      </div>
    </div>

    <!-- Active Responsive Cards -->
    <div class="standings-grid px-4 md:px-0 relative z-0">
      <ParticipantCard
        v-for="p in sortedParticipants" 
        :key="p.id"
        :participant="p"
        :rank="participantRanks[p.id]"
        :rank-class="getRankClass(participantRanks[p.id])"
        :is-fetching="isFetching"
      />
    </div>
  </div>
</template>

<style scoped>
.standings-grid {
  @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6;
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
