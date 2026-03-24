<script setup>
import { ref, onMounted, computed } from 'vue'
import { teams as initialTeams } from '../data/teams'
import { participants } from '../data/participants'
import { espnService } from '../services/espnService'

const viewMode = ref('teams') // 'teams' or 'owners'
const teams = ref([...initialTeams])
const isFetching = ref(true)
const baseR64Matches = ref([])

onMounted(async () => {
   isFetching.value = true
   await espnService.updateTeamsWithLiveStats(teams.value)
   
   // Fetch EXACT R64 tree from ESPN schedule dates to get absolute truth regions
   const r64_1 = await espnService.fetchGamesByDate('20260319')
   const r64_2 = await espnService.fetchGamesByDate('20260320')
   baseR64Matches.value = [...r64_1, ...r64_2]

   isFetching.value = false
})

const getOwner = (espnId) => {
  return participants.find(p => p.teamIds.map(String).includes(String(espnId)))?.name || 'Unowned'
}

const getDisplayName = (team) => {
   if (!team) return 'TBD'
   if (viewMode.value === 'owners') {
      const owner = getOwner(team.espnId)
      return team.abbreviation ? `${owner} (${team.abbreviation})` : owner
   }
   return team.shortDisplayName || team.name
}

const resolveWinner = (t1, t2, requiredWins) => {
   if (t1 && t1.wins >= requiredWins) return t1;
   if (t2 && t2.wins >= requiredWins) return t2;
   return null;
}

const regionOrder = ['East', 'South', 'West', 'Midwest']

// Dynamically compute the 7 columns of the massive tournament tree!
const bracketTree = computed(() => {
  if (teams.value.length === 0 || baseR64Matches.value.length === 0) return []
  
  // 1. Group the 32 authentic Round 1 games by their literal NCAA Region directly from ESPN Notes
  const regionMap = { 'East': [], 'West': [], 'South': [], 'Midwest': [] }
  
  baseR64Matches.value.forEach(game => {
      let regionStr = game.competitions[0].notes?.find(n => n.headline?.includes('Region'))?.headline || ''
      
      let region = 'East' // default fallback
      if (regionStr.includes('East')) region = 'East'
      else if (regionStr.includes('West')) region = 'West'
      else if (regionStr.includes('South')) region = 'South'
      else if (regionStr.includes('Midwest')) region = 'Midwest'

      const awayId = game.competitions[0].competitors.find(c=>c.homeAway==='away')?.team?.id || game.competitions[0].competitors[0].team.id
      const homeId = game.competitions[0].competitors.find(c=>c.homeAway==='home')?.team?.id || game.competitions[0].competitors[1].team.id
      
      const tA = teams.value.find(t=>t.espnId === String(awayId))
      const tB = teams.value.find(t=>t.espnId === String(homeId))

      if (tA && !tA.abbreviation) {
         tA.abbreviation = game.competitions[0].competitors.find(c=>c.homeAway==='away')?.team?.abbreviation || tA.name.substring(0,3).toUpperCase()
      }
      if (tB && !tB.abbreviation) {
         tB.abbreviation = game.competitions[0].competitors.find(c=>c.homeAway==='home')?.team?.abbreviation || tB.name.substring(0,3).toUpperCase()
      }
      
      if (regionMap[region]) {
         regionMap[region].push([tA, tB])
      }
  })

  // 2. Establish Round 1 layout securely in standard NCAA binary tree mathematical sequence
  const standardSeedOrder = [1, 8, 5, 4, 6, 3, 7, 2]
  const flatMatches = []
  
  regionOrder.forEach(regionName => {
     const regionMatches = regionMap[regionName]
     standardSeedOrder.forEach(targetSeed => {
         const match = regionMatches.find(m => (m[0] && m[0].seed === targetSeed) || (m[1] && m[1].seed === targetSeed))
         if (match && match[0] && match[1]) {
           // Ensure the higher-ranked seed (lower number) sits cleanly on top of the match block visually
           if (match[0].seed > match[1].seed) {
              flatMatches.push([match[1], match[0]])
           } else {
              flatMatches.push(match)
           }
         } else {
           flatMatches.push([null, null]) // Safety fallback
         }
     })
  })

  // 3. Algorithmically crunch winners dynamically based on raw win counts!
  // No explicit API bracket mapping is required because NCAA binary trees are perfect.
  const rounds = [flatMatches]
  let prevRound = flatMatches
  
  for(let winsNeeded=1; winsNeeded<=6; winsNeeded++) {
     const nextRound = []
     for(let i=0; i<prevRound.length; i+=2) {
        if (i+1 >= prevRound.length) { 
           // Edge case: End of the tree (The National Champion)
           const champ = resolveWinner(prevRound[i][0], prevRound[i][1], winsNeeded)
           nextRound.push([champ]) 
           break;
        }
        const w1 = resolveWinner(prevRound[i][0], prevRound[i][1], winsNeeded)
        const w2 = resolveWinner(prevRound[i+1][0], prevRound[i+1][1], winsNeeded)
        nextRound.push([w1, w2])
     }
     
     rounds.push(nextRound)
     if(nextRound.length === 1 && nextRound[0].length === 1) break; // Reached the solitary absolute winner array!
     
     prevRound = nextRound // Advance the evaluation tier for the next logical round
  }
  return rounds
})

const getRoundName = (idx) => {
  const names = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship', 'Champion']
  return names[idx] || `Round ${idx + 1}`
}

const getRegionChunks = (round, rndIdx) => {
   // Rounds 0-3 cover the strict 4-region quadrants before the Final Four crossover
   if (rndIdx > 3) return [round]; 
   
   const chunkSize = round.length / 4;
   return [
     round.slice(0, chunkSize),
     round.slice(chunkSize, chunkSize * 2),
     round.slice(chunkSize * 2, chunkSize * 3),
     round.slice(chunkSize * 3, round.length)
   ];
}
</script>

<template>
  <div class="wrapper animate-fade-in">
    
    <!-- View Switcher -->
    <div class="toggle-container flex justify-center mb-8">
      <div class="bg-black/50 p-1 rounded-full flex border border-glass-border">
        <button 
          @click="viewMode = 'teams'" 
          class="px-8 py-2 rounded-full text-sm sm:text-base font-bold transition-all"
          :class="viewMode === 'teams' ? 'bg-accent-base text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'"
        >Teams</button>
        <button 
          @click="viewMode = 'owners'" 
          class="px-8 py-2 rounded-full text-sm sm:text-base font-bold transition-all"
          :class="viewMode === 'owners' ? 'bg-accent-base text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'"
        >Owners</button>
      </div>
    </div>

    <!-- The Massive Scrollable Bracket Matrix -->
    <div v-if="isFetching" class="flex justify-center items-center py-32">
       <div class="w-12 h-12 border-4 border-accent-base/20 border-t-accent-base rounded-full animate-spin"></div>
    </div>

    <div v-else class="bracket-viewer">
      <div class="flex gap-6 pb-12 w-max mx-auto px-4 md:px-0">
        
        <!-- Dedicated Vertical Region Sidebar -->
        <div class="flex flex-col w-[35px] pt-[52px] pb-[4px] gap-8">
           <div class="flex-1 flex items-center justify-center font-black tracking-[0.3em] text-accent-base/70 uppercase text-xs rounded-l-lg bg-accent-base/5 border border-r-0 border-accent-base/20 shadow-[-5px_0_15px_-3px_rgba(147,51,234,0.05)]" style="writing-mode: vertical-rl; transform: rotate(180deg);" v-for="region in regionOrder" :key="region">
              {{ region }} REGION
           </div>
        </div>

        <div class="bracket-column" v-for="(round, rndIdx) in bracketTree" :key="rndIdx">
            
            <h3 class="round-title">{{ getRoundName(rndIdx) }}</h3>
            
            <!-- Mathematical perfectly justified flex tree -->
            <div class="flex flex-col flex-1 gap-8 h-full">

              <div class="flex flex-col justify-around flex-1 gap-2 py-1" v-for="(chunk, qIdx) in getRegionChunks(round, rndIdx)" :key="qIdx">
                <template v-for="(match, mIdx) in chunk" :key="mIdx">

                 <div class="match-card" :class="{'champ-card': match.length === 1, 'border-accent-base shadow-[0_0_15px_rgba(147,51,234,0.3)]': match.length === 1 && match[0]}">
                 
                 <!-- Binary Match Node -->
                 <template v-if="match.length === 2">
                   <div class="team-slot" :class="{'eliminated': match[0]?.eliminated}">
                      <div class="flex items-center w-full">
                        <span v-if="match[0]" class="team-seed">{{ match[0].seed }}</span>
                        <img v-if="match[0]?.logo" :src="match[0].logo" class="w-4 h-4 object-contain mr-1.5 drop-shadow-sm" />
                        <span class="team-name" :class="{'text-accent-base font-bold': viewMode==='owners'}">{{ getDisplayName(match[0]) }}</span>
                      </div>
                   </div>
                   
                   <div class="border-b border-glass-border"></div>
                   
                   <div class="team-slot" :class="{'eliminated': match[1]?.eliminated}">
                      <div class="flex items-center w-full">
                        <span v-if="match[1]" class="team-seed">{{ match[1].seed }}</span>
                        <img v-if="match[1]?.logo" :src="match[1].logo" class="w-4 h-4 object-contain mr-1.5 drop-shadow-sm" />
                        <span class="team-name" :class="{'text-accent-base font-bold': viewMode==='owners'}">{{ getDisplayName(match[1]) }}</span>
                      </div>
                   </div>
                 </template>

                 <!-- Absolute Champion Node Endpoint -->
                 <template v-else>
                    <div class="champ-slot text-center py-4 flex flex-col items-center justify-center min-h-[50px]">
                       <div class="text-[0.6rem] text-accent-base font-bold uppercase tracking-widest mb-1.5 opacity-80" v-if="match[0]">2026 CHAMPION</div>
                       <img v-if="match[0]?.logo" :src="match[0].logo" class="w-12 h-12 mb-2 object-contain drop-shadow" />
                       <div class="text-xl font-black truncate px-2 text-zinc-100 uppercase" :class="{'text-accent-base': viewMode==='owners'}">
                          {{ getDisplayName(match[0]) }}
                       </div>
                    </div>
                 </template>

                 </div>
                </template>
              </div>
            </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  @apply w-full max-w-full;
}

.bracket-viewer {
  @apply w-full overflow-x-auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 51, 234, 0.5) transparent;
}

.bracket-column {
  @apply flex flex-col w-[200px] xl:w-[240px];
}

.round-title {
  @apply text-center text-sm font-bold uppercase tracking-widest text-accent-base mb-6 border-b border-white/5 pb-2;
}

.match-card {
  @apply bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-md flex flex-col relative z-10 transition-colors;
}

.champ-card {
  @apply bg-zinc-800 border-accent-base border-2;
}

.team-slot {
  @apply flex items-center justify-between px-2 py-0.5 min-h-[1.75rem] transition-opacity;
}

.team-slot.eliminated {
  @apply opacity-30 grayscale;
}
.team-slot.eliminated .team-name {
  @apply line-through text-zinc-500;
}

.team-name {
  @apply text-[0.75rem] font-semibold truncate max-w-[130px] text-zinc-200 transition-colors;
}

.team-seed {
  @apply text-[0.6rem] font-bold text-zinc-500 mr-1.5 min-w-[12px];
}
</style>
