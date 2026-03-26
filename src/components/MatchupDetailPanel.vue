<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { teams } from '../data/teams'

const isExpanded = ref(false)

const props = defineProps({
  game: { type: Object, required: true },
  getParticipant: { type: Function, required: true }
})

const emit = defineEmits(['close'])
const router = useRouter()

const goToTeam = (espnId) => {
  if (espnId) {
    emit('close')
    router.push({ name: 'Teams', query: { teamId: espnId } })
  }
}

// ─── Competitors ───────────────────────────────────────────────────────────
const comp = computed(() => props.game.competitions[0])
const away = computed(() => comp.value.competitors.find(c => c.homeAway === 'away') || comp.value.competitors[0] || {})
const home = computed(() => comp.value.competitors.find(c => c.homeAway === 'home') || comp.value.competitors[1] || {})

// ─── State ─────────────────────────────────────────────────────────────────
const state = computed(() => props.game.status?.type?.state || 'pre')
const isPost = computed(() => state.value === 'post')
const isPre  = computed(() => state.value === 'pre')
const isLive = computed(() => state.value === 'in')

// ─── Pool owners ───────────────────────────────────────────────────────────
const awayOwner = computed(() => props.getParticipant(away.value.team?.id))
const homeOwner = computed(() => props.getParticipant(home.value.team?.id))

const ownerClass = (competitor) => {
  if (!isPost.value) return 'text-accent-base'
  return competitor.winner ? 'text-emerald-400' : 'text-zinc-500'
}

// ─── Seeds ─────────────────────────────────────────────────────────────────
const getSeed = (espnId) => teams.find(t => String(t.espnId) === String(espnId))?.seed

// ─── Meta ──────────────────────────────────────────────────────────────────
const roundHeadline = computed(() => {
  const notes = comp.value.notes?.map(n => n.headline).join(' ') || ''
  // "NCAA Men's Basketball Championship - West Region - Sweet 16" → "Sweet 16"
  const parts = notes.split(' - ')
  return parts.length >= 3 ? parts.slice(1).join(' · ') : notes
})

const venue = computed(() => {
  const v = comp.value.venue
  if (!v) return ''
  const city = v.address?.city || ''
  const state = v.address?.state || ''
  return [v.fullName, [city, state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
})

const broadcasts = computed(() => comp.value.broadcasts?.flatMap(b => b.names).join(' / ') || '')

// ─── Tip time / status ─────────────────────────────────────────────────────
const tipDetail = computed(() => props.game.status?.type?.detail || '')

// ─── Scores & linescores ───────────────────────────────────────────────────
const linescores = (competitor) => competitor.linescores || []
const totalScore = (competitor) => competitor.score || '0'

// ─── Attendance ────────────────────────────────────────────────────────────
const attendance = computed(() => {
  const a = comp.value.attendance
  return a > 0 ? a.toLocaleString() : null
})

// ─── Stat helpers ──────────────────────────────────────────────────────────
const getStat = (competitor, name) => {
  const s = (competitor.statistics || []).find(s => s.name === name)
  return s?.displayValue || '—'
}

const getStatNum = (competitor, name) => parseFloat(getStat(competitor, name)) || 0

// Stat bar: returns 0-100 percentages for both sides
const statBar = (name) => {
  const a = getStatNum(away.value, name)
  const h = getStatNum(home.value, name)
  const total = a + h
  if (!total) return { away: 50, home: 50 }
  return { away: Math.round((a / total) * 100), home: Math.round((h / total) * 100) }
}

// ─── Stats to display ──────────────────────────────────────────────────────
const postStats = [
  { label: 'FG%',  name: 'fieldGoalPct' },
  { label: '3P%',  name: 'threePointFieldGoalPct' },
  { label: 'FT%',  name: 'freeThrowPct' },
  { label: 'REB',  name: 'rebounds' },
  { label: 'AST',  name: 'assists' },
]

const preStats = [
  { label: 'PPG',  name: 'avgPoints' },
  { label: 'FG%',  name: 'fieldGoalPct' },
  { label: '3P%',  name: 'threePointFieldGoalPct' },
  { label: 'FT%',  name: 'freeThrowPct' },
]

const displayStats = computed(() => (isPost.value || isLive.value) ? postStats : preStats)

// ─── Leaders ───────────────────────────────────────────────────────────────
const leaderCategories = computed(() =>
  (isPost.value || isLive.value)
    ? ['points', 'rebounds', 'assists']
    : ['pointsPerGame', 'reboundsPerGame', 'assistsPerGame']
)

const leaderLabel = (name) => {
  const map = {
    points: 'PTS', rebounds: 'REB', assists: 'AST',
    pointsPerGame: 'PPG', reboundsPerGame: 'RPG', assistsPerGame: 'APG'
  }
  return map[name] || name
}

const getLeader = (competitor, catName) => {
  const cat = (competitor.leaders || []).find(l => l.name === catName)
  return cat?.leaders?.[0] || null
}

// ─── Vegas odds ────────────────────────────────────────────────────────────
const odds = computed(() => comp.value.odds?.[0] || null)

const spread = computed(() => odds.value?.details || null)
const overUnder = computed(() => odds.value?.overUnder != null ? `O/U ${odds.value.overUnder}` : null)

const moneylineHome = computed(() => odds.value?.moneyline?.home?.close?.odds || null)
const moneylineAway = computed(() => odds.value?.moneyline?.away?.close?.odds || null)

// ─── Recap ─────────────────────────────────────────────────────────────────
const recap = computed(() => comp.value.headlines?.[0] || null)

const recapUrl = computed(() => {
  const link = props.game.links?.find(l => l.rel?.includes('recap'))
  return link?.href || null
})

// ─── Season records ─────────────────────────────────────────────────────────
const seasonRecord = (competitor) => {
  return (competitor.records || []).find(r => r.type === 'total')?.summary || null
}
</script>

<template>
  <Transition name="fade">
    <div class="fixed inset-0 z-[100] flex justify-end" @keydown.esc="emit('close')">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" @click="emit('close')" />

      <!-- Panel -->
      <div 
        class="relative h-full bg-[#0a0a0c] border-l border-glass-border shadow-2xl flex flex-col animate-slide-in transition-all duration-300"
        :class="[isExpanded ? 'w-full' : 'w-full md:w-[520px]']"
      >


        <!-- ── Header ────────────────────────────────────────────────── -->
        <div class="flex-shrink-0 border-b border-glass-border bg-gradient-to-b from-accent-base/10 to-transparent">
          <!-- Round / meta strip -->
          <div class="px-4 pt-4 pb-3 flex items-center gap-2">
            <span v-if="roundHeadline" class="text-[0.65rem] font-black uppercase tracking-widest text-accent-base">{{ roundHeadline }}</span>
            <span v-if="broadcasts" class="ml-auto text-[0.65rem] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">{{ broadcasts }}</span>
            
            <!-- Expand Button (Desktop Only) -->
            <button 
              @click="isExpanded = !isExpanded" 
              class="hidden md:flex flex-shrink-0 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors ml-2"
              title="Toggle Expand"
            >
              <svg v-if="!isExpanded" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 4v4m0 0H6m4 0l-5-5m9 5h4m-4 0V4m0 4l5-5M10 20v-4m0 0H6m4 0l-5 5m9-5h4m-4 0v4m0-4l5 5" />
              </svg>
            </button>

            <button @click="emit('close')" class="flex-shrink-0 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Teams row -->
          <div class="px-6 pb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

            <!-- Away -->
            <div class="flex flex-col items-center text-center gap-2 cursor-pointer group" @click="goToTeam(away.team?.id)">
              <div class="relative inline-block">
                <img v-if="away.team?.logo" :src="away.team.logo" class="w-16 h-16 object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-200" :class="isPost && away.winner === false ? 'opacity-40' : ''" />
                <div v-if="getSeed(away.team?.id)" class="absolute -top-1 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
                  <span class="text-[0.55rem] font-bold text-zinc-300">{{ getSeed(away.team?.id) }}</span>
                </div>
              </div>
              <div>
                <div class="font-bold text-sm" :class="isPost && away.winner === false ? 'text-zinc-500' : 'text-zinc-200'">{{ away.team?.shortDisplayName || away.team?.name }}</div>
                <div v-if="awayOwner" class="text-[0.65rem] font-black uppercase tracking-widest mt-0.5" :class="ownerClass(away)">{{ awayOwner }}</div>
              </div>
              <!-- Post: big score -->
              <div v-if="isPost || isLive" class="text-3xl font-black" :class="isPost && away.winner === false ? 'text-zinc-500' : 'text-white'">{{ totalScore(away) }}</div>
              <!-- Linescore (post or live partial) -->
              <div v-if="(isPost || isLive) && linescores(away).length" class="flex gap-1">
                <span v-for="(ls, i) in linescores(away)" :key="i" class="text-[0.6rem] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{{ ls.displayValue }}</span>
              </div>
            </div>

            <!-- Center -->
            <div class="flex flex-col items-center gap-1 text-center px-2">
              <template v-if="isPre">
                <div class="text-zinc-500 text-xs font-bold">{{ tipDetail }}</div>
              </template>
              <template v-else-if="isLive">
                <div class="text-emerald-400 font-black text-xs tracking-widest animate-pulse">LIVE</div>
                <div class="text-zinc-300 text-xs font-bold">{{ game.status?.type?.detail }}</div>
              </template>
              <template v-else>
                <div class="text-white font-black text-sm tracking-widest">FINAL</div>
              </template>
              <div class="text-zinc-600 text-sm font-black">VS</div>
            </div>

            <!-- Home -->
            <div class="flex flex-col items-center text-center gap-2 cursor-pointer group" @click="goToTeam(home.team?.id)">
              <div class="relative inline-block">
                <img v-if="home.team?.logo" :src="home.team.logo" class="w-16 h-16 object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-200" :class="isPost && home.winner === false ? 'opacity-40' : ''" />
                <div v-if="getSeed(home.team?.id)" class="absolute -top-1 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
                  <span class="text-[0.55rem] font-bold text-zinc-300">{{ getSeed(home.team?.id) }}</span>
                </div>
              </div>
              <div>
                <div class="font-bold text-sm" :class="isPost && home.winner === false ? 'text-zinc-500' : 'text-zinc-200'">{{ home.team?.shortDisplayName || home.team?.name }}</div>
                <div v-if="homeOwner" class="text-[0.65rem] font-black uppercase tracking-widest mt-0.5" :class="ownerClass(home)">{{ homeOwner }}</div>
              </div>
              <div v-if="isPost || isLive" class="text-3xl font-black" :class="isPost && home.winner === false ? 'text-zinc-500' : 'text-white'">{{ totalScore(home) }}</div>
              <div v-if="(isPost || isLive) && linescores(home).length" class="flex gap-1">
                <span v-for="(ls, i) in linescores(home)" :key="i" class="text-[0.6rem] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{{ ls.displayValue }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Scrollable Body ────────────────────────────────────────── -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

          <!-- Venue / Attendance -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span v-if="venue" class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              {{ venue }}
            </span>
            <span v-if="attendance">🏟 {{ attendance }} fans</span>
          </div>

          <!-- Season records (pre/live) -->
          <div v-if="!isPost" class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-zinc-900/60 rounded-xl p-3 border border-glass-border">
              <div class="text-base font-black text-white">{{ seasonRecord(away) || '—' }}</div>
              <div class="text-[0.6rem] text-zinc-500 uppercase tracking-widest mt-0.5">{{ away.team?.abbreviation }} Record</div>
            </div>
            <div />
            <div class="bg-zinc-900/60 rounded-xl p-3 border border-glass-border">
              <div class="text-base font-black text-white">{{ seasonRecord(home) || '—' }}</div>
              <div class="text-[0.6rem] text-zinc-500 uppercase tracking-widest mt-0.5">{{ home.team?.abbreviation }} Record</div>
            </div>
          </div>

          <!-- Recap blurb (post) -->
          <a v-if="isPost && recap" :href="recapUrl || '#'" :target="recapUrl ? '_blank' : undefined" rel="noopener noreferrer"
            class="block bg-zinc-900/60 rounded-xl p-4 border border-glass-border space-y-2 transition-colors duration-200"
            :class="recapUrl ? 'hover:border-accent-base/40 hover:bg-zinc-900/80 cursor-pointer' : 'cursor-default'"
          >
            <p class="text-xs font-bold text-zinc-200 leading-relaxed">{{ recap.shortLinkText }}</p>
            <p class="text-[0.7rem] text-zinc-400 leading-relaxed italic">{{ recap.description }}</p>
            <p v-if="recapUrl" class="text-[0.6rem] text-accent-base font-bold uppercase tracking-widest mt-1">Read full recap on ESPN →</p>
          </a>

          <!-- Stat Comparison Bars -->
          <div v-if="displayStats.length" class="space-y-3">
            <div class="text-[0.65rem] font-black uppercase tracking-widest text-zinc-500">{{ (isPost || isLive) ? 'Game Stats' : 'Season Averages' }}</div>
            <div v-for="stat in displayStats" :key="stat.name" class="space-y-1">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-zinc-200 w-12 text-left">{{ getStat(away, stat.name) }}</span>
                <span class="text-zinc-500 text-[0.65rem] uppercase tracking-widest">{{ stat.label }}</span>
                <span class="font-bold text-zinc-200 w-12 text-right">{{ getStat(home, stat.name) }}</span>
              </div>
              <div class="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                <div class="h-full bg-accent-base/70 transition-all duration-500 rounded-l-full" :style="{ width: statBar(stat.name).away + '%' }" />
                <div class="h-full bg-zinc-600/70 transition-all duration-500 rounded-r-full" :style="{ width: statBar(stat.name).home + '%' }" />
              </div>
            </div>
          </div>

          <!-- Game / Season Leaders -->
          <div class="space-y-3">
            <div class="text-[0.65rem] font-black uppercase tracking-widest text-zinc-500">{{ (isPost || isLive) ? 'Game Leaders' : 'Season Leaders' }}</div>
            <div class="grid grid-cols-2 gap-3">
              <!-- Away leaders -->
              <div class="space-y-2">
                <div class="text-[0.6rem] font-bold text-zinc-600 uppercase text-center">{{ away.team?.abbreviation }}</div>
                <div v-for="cat in leaderCategories" :key="'a-' + cat">
                  <div v-if="getLeader(away, cat)" class="bg-zinc-900/60 border border-glass-border rounded-lg p-2 flex items-center gap-2">
                    <img v-if="getLeader(away, cat).athlete?.headshot" :src="getLeader(away, cat).athlete.headshot" class="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-zinc-800" />
                    <div class="min-w-0">
                      <div class="text-[0.6rem] font-bold text-zinc-200 truncate">{{ getLeader(away, cat).athlete?.shortName }}</div>
                      <div class="text-[0.55rem] text-zinc-500">{{ leaderLabel(cat) }}: <span class="text-accent-base font-bold">{{ getLeader(away, cat).displayValue }}</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Home leaders -->
              <div class="space-y-2">
                <div class="text-[0.6rem] font-bold text-zinc-600 uppercase text-center">{{ home.team?.abbreviation }}</div>
                <div v-for="cat in leaderCategories" :key="'h-' + cat">
                  <div v-if="getLeader(home, cat)" class="bg-zinc-900/60 border border-glass-border rounded-lg p-2 flex items-center gap-2">
                    <img v-if="getLeader(home, cat).athlete?.headshot" :src="getLeader(home, cat).athlete.headshot" class="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-zinc-800" />
                    <div class="min-w-0">
                      <div class="text-[0.6rem] font-bold text-zinc-200 truncate">{{ getLeader(home, cat).athlete?.shortName }}</div>
                      <div class="text-[0.55rem] text-zinc-500">{{ leaderLabel(cat) }}: <span class="text-accent-base font-bold">{{ getLeader(home, cat).displayValue }}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Vegas Odds (pre / live only) -->
          <div v-if="!isPost && odds" class="space-y-3">
            <div class="text-[0.65rem] font-black uppercase tracking-widest text-zinc-500">Vegas Odds</div>
            <div class="bg-zinc-900/60 rounded-xl border border-glass-border p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <div class="text-sm font-black text-white">{{ spread || '—' }}</div>
                <div class="text-[0.6rem] text-zinc-500 uppercase tracking-wide mt-0.5">Spread</div>
              </div>
              <div>
                <div class="text-sm font-black text-white">{{ overUnder || '—' }}</div>
                <div class="text-[0.6rem] text-zinc-500 uppercase tracking-wide mt-0.5">Total</div>
              </div>
              <div>
                <div class="text-xs font-black text-white leading-tight">
                  <span class="block">{{ away.team?.abbreviation }} {{ moneylineAway || '—' }}</span>
                  <span class="block">{{ home.team?.abbreviation }} {{ moneylineHome || '—' }}</span>
                </div>
                <div class="text-[0.6rem] text-zinc-500 uppercase tracking-wide mt-0.5">Moneyline</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.animate-slide-in {
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes slideIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgb(39 39 42); border-radius: 9999px; }
</style>
