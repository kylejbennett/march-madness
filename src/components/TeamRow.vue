<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  team: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const goToTeam = () => {
   if (props.team?.espnId) {
      router.push({ name: 'Teams', query: { teamId: props.team.espnId } })
   }
}
</script>

<template>
  <div 
    class="team-row cursor-pointer"
    :class="{ 'is-eliminated': team.eliminated }"
    @click="goToTeam"
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

.is-eliminated:hover {
  @apply bg-white/5 border-transparent;
}

.team-info {
  @apply flex items-center flex-1 gap-3 transition-all duration-200;
}

.is-eliminated .team-info {
  @apply opacity-35 grayscale;
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

.is-eliminated .team-name {
  @apply line-through;
}

.team-score {
  font-family: theme('fontFamily.handwritten');
  @apply font-bold tracking-widest text-zinc-200;
}
</style>
