<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { teams as initialTeams } from '../data/teams'
import { participants } from '../data/participants'
import { espnService } from '../services/espnService'

const route = useRoute()
const router = useRouter()

const teams = ref([...initialTeams])
const searchQuery = ref('')
const selectedTeam = ref(null)
const teamSchedule = ref([])
const isLoadingSchedule = ref(false)

onMounted(async () => {
   // Quietly update team wins silently in the background
   espnService.updateTeamsWithLiveStats(teams.value)
   
   // Handle Deep-Linked routing via Vue Router Queries
   if (route.query.teamId) {
      const activeTeam = teams.value.find(t => String(t.espnId) === String(route.query.teamId))
      if (activeTeam) selectTeam(activeTeam)
   }
})

watch(() => route.query.teamId, (newId) => {
   if (newId) {
      const activeTeam = teams.value.find(t => String(t.espnId) === String(newId))
      if (activeTeam) selectTeam(activeTeam)
   }
})

const filteredTeams = computed(() => {
   const q = searchQuery.value.toLowerCase()
   if (!q) return [...teams.value].sort((a,b) => a.seed - b.seed)
   return teams.value.filter(t => t.name.toLowerCase().includes(q) || String(t.seed) === q).sort((a,b) => a.seed - b.seed)
})

const getOwner = (espnId) => {
  return participants.find(p => p.teamIds.map(String).includes(String(espnId)))?.name || 'Unowned'
}

const selectTeam = async (team) => {
   selectedTeam.value = team
   isLoadingSchedule.value = true
   
   // Ping ESPN strictly for their chronological tournament matchups
   teamSchedule.value = await espnService.fetchTeamSchedule(team.espnId)
   isLoadingSchedule.value = false
}

const closePanel = () => {
   selectedTeam.value = null
   teamSchedule.value = []
   
   // Silently strip the deep-linked parameter off the URL
   router.replace({ name: 'Teams', query: {} })
}

// Logic parsers for the modal Game History rows
const getOpponent = (game, myTeamId) => {
   const comps = game?.competitions?.[0]?.competitors || []
   return comps.find(c => String(c?.team?.id) !== String(myTeamId))?.team
}

const isGameComplete = (game) => {
   const status = game?.competitions?.[0]?.status
   return status?.type?.completed || status?.type?.state === 'post'
}

const isWinner = (game, myTeamId) => {
   const comps = game?.competitions?.[0]?.competitors || []
   const myTeam = comps.find(c => String(c?.team?.id) === String(myTeamId))
   return myTeam?.winner
}

const getResultString = (game, myTeamId) => {
   if (!isGameComplete(game)) return ''
   const comps = game?.competitions?.[0]?.competitors || []
   const myTeam = comps.find(c => String(c?.team?.id) === String(myTeamId))
   const otherTeam = comps.find(c => String(c?.team?.id) !== String(myTeamId))
   
   if (!myTeam || !otherTeam) return 'FINAL'
   if (myTeam.winner) return `W ${myTeam.score?.displayValue || '0'}-${otherTeam.score?.displayValue || '0'}`
   return `L ${myTeam.score?.displayValue || '0'}-${otherTeam.score?.displayValue || '0'}`
}

const getRoundHeadline = (game) => {
   const notes = game?.competitions?.[0]?.notes?.map(n => n.headline).join(' ') || ''
   return notes.split('-').pop()?.trim() || 'NCAA Tournament Matchup'
}

const formatTipTime = (dateStr) => {
   if (!dateStr) return 'TBD'
   return new Date(dateStr).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const getTeamRecord = () => {
   if (!teamSchedule.value || teamSchedule.value.length === 0) return ''
   
   // Loop backwards algorithmically to bypass sparse ESPN TBD future match nodes 
   for (let i = teamSchedule.value.length - 1; i >= 0; i--) {
       const game = teamSchedule.value[i]
       const comps = game?.competitions?.[0]?.competitors || []
       const myTeam = comps.find(c => String(c?.team?.id) === String(selectedTeam.value.espnId))
       
       const totalRecord = myTeam?.record?.find(r => r.type === 'total')
       if (totalRecord?.displayValue) {
           return `Overall Record: ${totalRecord.displayValue}`
       }
   }
   return ''
}
</script>

<template>
  <div class="wrapper animate-fade-in relative max-w-[1400px] mx-auto min-h-screen">
    
    <!-- Header & Search Input -->
    <div class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 px-4 md:px-0">
      <div>
        <h2 class="text-3xl font-black text-white uppercase tracking-wider mb-1">Teams Directory</h2>
        <p class="text-zinc-400">Search and explore the path of all 64 tournament teams.</p>
      </div>
      
      <div class="relative w-full md:w-80 shadow-2xl">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-accent-base" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search by team or seed..." 
          class="block w-full pl-12 pr-4 py-3 bg-zinc-900/80 border border-glass-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-base focus:border-transparent transition-all backdrop-blur-md"
        >
      </div>
    </div>

    <!-- Master Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 px-4 md:px-0 relative z-10 pb-20">
      <div v-for="team in filteredTeams" :key="team.id" @click="selectTeam(team)"
           class="team-card group cursor-pointer" :class="{'opacity-40 grayscale hover:grayscale-0 hover:opacity-100': team.eliminated && !searchQuery}">
        
        <div class="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 border border-zinc-600 z-20 shadow-lg">
           <span class="text-[0.6rem] font-bold text-zinc-300">{{ team.seed }}</span>
        </div>
        
        <img :src="team.logo" class="w-16 h-16 object-contain mb-3 drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
        <h3 class="text-xs font-bold text-center text-zinc-100 leading-tight line-clamp-2 px-1 group-hover:text-accent-base transition-colors h-[30px] flex items-center justify-center">{{ team.name }}</h3>
        
        <div class="mt-2 w-full border-t border-white/5 pt-1.5 flex justify-center">
           <span class="text-[0.55rem] font-bold uppercase tracking-wider text-accent-base/80 bg-accent-base/5 px-2 py-0.5 rounded">{{ getOwner(team.espnId) }}</span>
        </div>
      </div>
      
      <div v-if="filteredTeams.length === 0" class="col-span-full py-20 text-center text-zinc-500">
         No teams found matching "{{ searchQuery }}"
      </div>
    </div>

    <!-- Active Team Details Modal / Slide-over -->
    <Transition name="fade">
      <div v-if="selectedTeam" class="fixed inset-0 z-[100] flex justify-end">
         
         <div class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" @click="closePanel"></div>
         
         <div class="relative w-full md:w-[500px] h-full bg-[#0a0a0c] border-l border-glass-border shadow-2xl flex flex-col transform transition-transform animate-slide-in">
            
            <!-- Close Button -->
            <button @click="closePanel" class="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors z-50">
               <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <!-- Profile Header -->
            <div class="pt-16 pb-8 px-8 border-b border-glass-border relative overflow-hidden bg-gradient-to-b from-accent-base/10 to-transparent flex-shrink-0">
               <div class="flex items-center gap-6 relative z-10">
                  <div class="relative">
                     <img :src="selectedTeam.logo" class="w-24 h-24 object-contain drop-shadow-xl" />
                     <div class="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-accent-base text-white font-black text-sm flex items-center justify-center shadow-lg border-2 border-[#0a0a0c]">{{ selectedTeam.seed }}</div>
                  </div>
                  <div>
                     <h2 class="text-3xl font-black text-white leading-tight">{{ selectedTeam.name }}</h2>
                     <div v-if="getTeamRecord()" class="text-zinc-400 font-bold text-sm tracking-wide mt-1">{{ getTeamRecord() }}</div>
                     <div class="text-accent-base font-black uppercase tracking-[0.2em] text-[0.65rem] mt-3">Drafted by: {{ getOwner(selectedTeam.espnId) }}</div>
                  </div>
               </div>
            </div>

            <!-- Path Pipeline -->
            <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <h3 class="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-6">Tournament Path</h3>
               
               <div v-if="isLoadingSchedule" class="flex justify-center py-20">
                  <div class="w-10 h-10 border-4 border-zinc-800 border-t-accent-base rounded-full animate-spin"></div>
               </div>
               
               <div v-else-if="teamSchedule.length === 0" class="text-center py-10 text-zinc-500 italic">
                  Game data has not been generated for this team yet.
               </div>
               
               <div v-else class="flex flex-col relative before:absolute before:inset-y-0 before:left-6 before:w-px before:bg-glass-border">
                  
                  <div v-for="(game, idx) in teamSchedule" :key="game.id" class="relative pl-16 mb-10 last:mb-0 group">
                     
                     <!-- Timeline Node -->
                     <div class="absolute left-[22px] top-1 w-[5px] h-[5px] rounded-full bg-accent-base ring-4 ring-[#0a0a0c] group-hover:scale-150 transition-transform"></div>
                     <h4 class="text-accent-base font-black text-[0.65rem] uppercase tracking-widest mb-3" style="text-shadow: 0 0 10px rgba(147,51,234,0.5);">{{ getRoundHeadline(game) }}</h4>
                     
                     <div class="bg-zinc-900/50 backdrop-blur-sm border rounded-xl p-4 shadow-lg transition-colors"
                          :class="[
                             isGameComplete(game) 
                               ? (isWinner(game, selectedTeam.espnId) ? 'border-emerald-500/50' : 'border-rose-500/50')
                               : 'border-glass-border hover:border-accent-base/40'
                          ]">
                        
                        <div class="flex items-center justify-between gap-4">
                           
                           <!-- Opponent Block -->
                           <div class="flex items-center gap-3">
                              <span class="text-xs font-bold text-zinc-500 italic mr-1">vs</span>
                              <img v-if="getOpponent(game, selectedTeam.espnId)?.logo" :src="getOpponent(game, selectedTeam.espnId).logo" class="w-8 h-8 object-contain flex-shrink-0" />
                              <span class="font-bold text-zinc-100 text-sm leading-tight flex-1">{{ getOpponent(game, selectedTeam.espnId)?.displayName || 'TBD' }}</span>
                           </div>

                           <!-- Data Block -->
                           <div class="text-right flex-shrink-0">
                              <div v-if="isGameComplete(game)" 
                                   :class="isWinner(game, selectedTeam.espnId) ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'" 
                                   class="font-black px-3 py-1 rounded inline-block text-[0.7rem] uppercase">
                                 {{ getResultString(game, selectedTeam.espnId) }}
                              </div>
                              <div v-else-if="game?.competitions?.[0]?.status?.type?.state === 'in'" class="text-accent-base font-black text-xs animate-pulse bg-accent-base/10 border border-accent-base/20 px-2 py-1 rounded">
                                 LIVE • {{ game?.competitions?.[0]?.status?.displayClock || '0:00' }}
                              </div>
                              <div v-else class="text-zinc-500 text-[0.65rem] font-bold">
                                 {{ formatTipTime(game?.date) }}
                              </div>
                           </div>

                        </div>
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.team-card {
  @apply bg-zinc-900/40 backdrop-blur border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300;
}
.team-card:hover {
  @apply border-accent-base/50 bg-zinc-900/80 shadow-[0_0_20px_rgba(147,51,234,0.15)] transform -translate-y-1;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-zinc-800 rounded-full;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  @apply bg-zinc-600;
}

.animate-slide-in {
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
