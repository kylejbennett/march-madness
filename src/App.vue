<script setup>
import { ref, onMounted, computed } from 'vue'
import { espnService } from './services/espnService'
import { teams as initialTeams } from './data/teams'
import { participants as initialParticipants } from './data/participants'
import ParticipantCard from './components/ParticipantCard.vue'

const teams = ref([...initialTeams])
const participants = ref([...initialParticipants])
const isFetching = ref(true)

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

const getRankClass = (rank) => {
  if (isFetching.value || !rank) return ''
  if (rank === 1) return 'rank-1'
  if (rank === 2) return 'rank-2'
  if (rank === 3) return 'rank-3'
  return ''
}
</script>

<template>
  <div class="app-container">
    <header class="pool-header">
      <h1 class="pool-title">8 Team Pool</h1>
      <p class="pool-subtitle">
        {{ isFetching ? 'Fetching Live ESPN Standings...' : 'Live Standings & Bracket Updates' }}
      </p>
    </header>

    <main>
      <div class="standings-grid">
        <ParticipantCard
          v-for="p in participants" 
          :key="p.id"
          :participant="p"
          :rank="participantRanks[p.id]"
          :rank-class="getRankClass(participantRanks[p.id])"
          :is-fetching="isFetching"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  @apply p-4 md:p-8 max-w-[1800px] mx-auto;
}

.pool-header {
  @apply text-center mb-12 pb-8 border-b border-glass-border;
}

.pool-title {
  @apply text-4xl md:text-5xl font-semibold text-white tracking-wider uppercase mb-2;
}

.pool-subtitle {
  @apply text-base text-accent-base uppercase tracking-widest;
}

.standings-grid {
  @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6;
}
</style>
