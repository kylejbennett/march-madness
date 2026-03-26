<script setup>
import TeamRow from './TeamRow.vue'

const props = defineProps({
  participant: {
    type: Object,
    required: true
  },
  rank: {
    type: Number,
    required: false
  },
  rankClass: {
    type: String,
    default: ''
  },
  isFetching: {
    type: Boolean,
    default: false
  }
})

const ordinal = (n) => {
  if (!n) return ''
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
</script>

<template>
  <article class="participant-col glass-panel">
    <header class="participant-header">
      <div class="flex items-center">
        <div 
          v-if="!isFetching && rank"
          class="rank-badge" 
          :class="rankClass"
        >
          {{ ordinal(rank) }}
        </div>
        <h2 class="participant-name">{{ participant.name }}</h2>
      </div>
      <div class="participant-wins">
        {{ participant.totalWins || 0 }} {{ participant.totalWins === 1 ? 'WIN' : 'WINS' }}
      </div>
    </header>

    <div class="team-list">
      <template v-if="isFetching">
        <div v-for="id in participant.teamIds" :key="'mock-'+id" class="team-row opacity-50">
            <div class="team-info">
              <span class="team-name">Loading team...</span>
            </div>
        </div>
      </template>

      <template v-else>
        <TeamRow 
          v-for="team in participant.teams" 
          :key="team.id"
          :team="team"
        />
      </template>
    </div>
  </article>
</template>

<style scoped>
.glass-panel {
  @apply bg-glass-bg backdrop-blur-md border border-glass-border rounded-md;
}
.glass-panel:hover {
  @apply border-glass-border-hover;
}

.participant-col {
  @apply flex flex-col p-4 transition-all duration-200 ease-in-out;
}

.participant-header {
  @apply flex justify-between items-center mb-4 pb-3 border-b border-glass-border;
}

.participant-name {
  @apply text-xl lg:text-lg xl:text-xl font-medium text-zinc-200;
}

.participant-wins {
  @apply bg-transparent px-3 py-1 border border-accent-base rounded-full text-accent-base font-semibold text-sm tracking-wide;
}

.team-list {
  @apply flex flex-col gap-2 flex-1;
}

.rank-badge {
  @apply inline-flex items-center justify-center min-w-[2.5rem] px-1.5 h-6 rounded-sm font-semibold text-sm bg-white/5 mr-3 text-zinc-400;
}

/* Hardcode specific rank backgrounds just like the older CSS */
.rank-1 { @apply bg-accent-base text-white; }
.rank-2 { @apply bg-accent-base/60 text-white; }
.rank-3 { @apply bg-accent-base/30 text-white; }
</style>
