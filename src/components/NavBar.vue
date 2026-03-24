<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = ['Overview', 'Matchups', 'Bracket', 'Teams']

const navigate = (tab) => {
  router.push({ name: tab })
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
  @apply grid grid-cols-4 sm:flex sm:items-center sm:justify-center w-full flex-1 gap-1 sm:gap-6;
}

.nav-tab {
  @apply text-center px-1 sm:px-4 py-2 sm:rounded-full rounded-md text-[0.7rem] sm:text-base text-zinc-400 font-medium sm:tracking-wider transition-all duration-200 hover:text-zinc-200 hover:bg-white/5 outline-none;
}

.active-tab {
  @apply bg-accent-base/10 text-accent-base shadow-[inset_0_0_20px_rgba(147,51,234,0.15)] ring-1 ring-accent-base/30;
}
</style>
