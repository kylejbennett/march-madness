<script setup>
defineProps({
  team: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div 
    class="team-row"
    :class="{ 'team-eliminated': team.eliminated }"
  >
    <div class="team-info">
      <img v-if="team.logo" :src="team.logo" :alt="team.name" class="team-logo" />
      <span v-if="team.seed" class="team-seed">{{ team.seed }}</span>
      <span class="team-name">{{ team.name }}</span>
    </div>
    <div class="team-score">
      {{ '|'.repeat(team.wins) }}
    </div>
  </div>
</template>

<style scoped>
.team-row {
  @apply flex items-center p-2 px-3 bg-white/5 border border-transparent rounded transition-all duration-200 ease-in-out;
}

.team-row:hover {
  @apply bg-white/10 border-white/5;
}

.team-eliminated {
  @apply opacity-35 grayscale;
}

.team-eliminated:hover {
  @apply bg-transparent border-transparent;
}

.team-info {
  @apply flex items-center flex-1 gap-3;
}

.team-logo {
  @apply w-6 h-6 object-contain;
}

.team-seed {
  @apply text-sm text-zinc-400 font-medium;
}

.team-name {
  @apply font-normal text-sm leading-tight;
}

.team-eliminated .team-name {
  @apply line-through;
}

.team-score {
  font-family: theme('fontFamily.handwritten');
  @apply font-bold tracking-widest text-zinc-400;
}

.team-row:not(.team-eliminated) .team-score {
  @apply text-zinc-200;
}
</style>
