<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { teams } from '../data/teams'

const router = useRouter()
const props = defineProps({
  game: {
    type: Object,
    required: true
  },
  getParticipant: {
    type: Function,
    required: true
  }
})

// ESPN usually has [0] as away, [1] as home in competitions.competitors
const awayTeam = computed(() => props.game.competitions[0].competitors.find(c => c.homeAway === 'away') || props.game.competitions[0].competitors[0] || {})
const homeTeam = computed(() => props.game.competitions[0].competitors.find(c => c.homeAway === 'home') || props.game.competitions[0].competitors[1] || {})

const pAwayName = computed(() => props.getParticipant(awayTeam.value.team?.id))
const pHomeName = computed(() => props.getParticipant(homeTeam.value.team?.id))

const statusState = computed(() => props.game.status?.type?.state || 'pre')
const statusDetail = computed(() => props.game.status?.type?.detail || '')

const getSeed = (espnId) => {
   return teams.find(t => String(t.espnId) === String(espnId))?.seed
}

const goToTeam = (espnId) => {
   if (espnId) router.push({ name: 'Teams', query: { teamId: espnId } })
}

const startTime = computed(() => {
  if (!props.game.date) return ''
  return new Date(props.game.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
})
</script>

<template>
  <article class="glass-panel overflow-hidden flex flex-col">
    <!-- Spotlight Banner -->
    <div v-if="pAwayName || pHomeName" class="bg-zinc-900 border-b border-accent-base/20 px-4 py-3 flex items-center justify-center shadow-inner">
      <div class="flex-1 text-right">
        <span v-if="pAwayName" class="text-sm sm:text-base font-black text-accent-base uppercase tracking-widest drop-shadow-md">{{ pAwayName }}</span>
        <span v-else class="text-[0.7rem] font-medium text-zinc-600 uppercase tracking-wider">Unowned</span>
      </div>
      <div class="px-3 text-[0.7rem] font-black uppercase tracking-widest">VS</div>
      <div class="flex-1">
        <span v-if="pHomeName" class="text-sm sm:text-base font-black text-accent-base uppercase tracking-widest drop-shadow-md">{{ pHomeName }}</span>
        <span v-else class="text-[0.7rem] font-medium text-zinc-600 uppercase tracking-wider">Unowned</span>
      </div>
    </div>

    <!-- Game Content -->
    <div class="p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 flex-1">
      
      <!-- Away Team -->
      <div class="flex flex-col items-center text-center gap-1 cursor-pointer group" @click="goToTeam(awayTeam.team?.id)">
         <div class="relative inline-block group-hover:scale-110 transition-transform duration-200">
            <img v-if="awayTeam.team?.logo" :src="awayTeam.team.logo" class="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-md relative z-10" />
            <div v-if="getSeed(awayTeam.team?.id)" class="absolute -top-1 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 shadow-[0_2px_5px_rgba(0,0,0,0.5)] flex items-center justify-center z-20">
               <span class="text-[0.6rem] font-bold text-zinc-300">{{ getSeed(awayTeam.team?.id) }}</span>
            </div>
         </div>
         <div class="flex flex-col mt-1">
           <span class="font-semibold text-sm leading-tight text-zinc-200">{{ awayTeam.team?.shortDisplayName || awayTeam.team?.name }}</span>
         </div>
         <span v-if="statusState !== 'pre'" class="text-2xl font-bold mt-1" :class="{'text-zinc-500': statusState === 'post' && awayTeam.winner === false}">{{ awayTeam.score || '0' }}</span>
      </div>

      <!-- Center Status -->
      <div class="flex flex-col items-center justify-center text-center px-2 min-w-[70px]">
         <template v-if="statusState === 'pre'">
           <span class="text-sm font-semibold text-zinc-300">{{ startTime }}</span>
           <span class="text-[0.65rem] text-zinc-500 mt-1 uppercase tracking-wide max-w-[100px] truncate" :title="game.competitions[0]?.venue?.fullName">
             {{ game.competitions[0]?.venue?.address?.city || 'TBD' }}
           </span>
         </template>
         
         <template v-else-if="statusState === 'in'">
           <span class="text-emerald-400 font-bold text-xs tracking-widest animate-pulse mb-1">LIVE</span>
           <span class="text-xs text-zinc-300 font-medium whitespace-nowrap">{{ statusDetail }}</span>
         </template>
         
         <template v-else-if="statusState === 'post'">
           <span class="text-zinc-500 font-bold tracking-widest text-sm">FINAL</span>
         </template>
      </div>

      <!-- Home Team -->
      <div class="flex flex-col items-center text-center gap-1 cursor-pointer group" @click="goToTeam(homeTeam.team?.id)">
         <div class="relative inline-block group-hover:scale-110 transition-transform duration-200">
            <img v-if="homeTeam.team?.logo" :src="homeTeam.team.logo" class="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-md relative z-10" />
            <div v-if="getSeed(homeTeam.team?.id)" class="absolute -top-1 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 shadow-[0_2px_5px_rgba(0,0,0,0.5)] flex items-center justify-center z-20">
               <span class="text-[0.6rem] font-bold text-zinc-300">{{ getSeed(homeTeam.team?.id) }}</span>
            </div>
         </div>
         <div class="flex flex-col mt-1">
           <span class="font-semibold text-sm leading-tight text-zinc-200">{{ homeTeam.team?.shortDisplayName || homeTeam.team?.name }}</span>
         </div>
         <span v-if="statusState !== 'pre'" class="text-2xl font-bold mt-1" :class="{'text-zinc-500': statusState === 'post' && homeTeam.winner === false}">{{ homeTeam.score || '0' }}</span>
      </div>

    </div>
  </article>
</template>

<style scoped>
.glass-panel {
  @apply bg-glass-bg backdrop-blur-md border border-glass-border rounded-xl transition-all duration-300 hover:border-glass-border-hover hover:-translate-y-1 hover:shadow-xl hover:shadow-accent-base/5;
}
</style>
