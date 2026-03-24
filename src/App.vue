<script setup>
import NavBar from './components/NavBar.vue'
</script>

<template>
  <NavBar />

  <div class="app-container">
    <header class="pool-header">
      <h1 class="pool-title">8 Team Pool</h1>
      <p class="pool-subtitle">
        Live Standings & Bracket Updates
      </p>
    </header>

    <main class="animate-fade-in relative min-h-[50vh]">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  @apply p-4 md:p-8 max-w-[1800px] mx-auto min-h-screen flex flex-col;
}

.pool-header {
  @apply text-center mb-8 md:mb-12 pb-6 md:pb-8 border-b border-glass-border;
}

.pool-title {
  @apply text-4xl md:text-5xl font-semibold text-white tracking-wider uppercase mb-2;
}

.pool-subtitle {
  @apply text-sm md:text-base text-accent-base uppercase tracking-widest;
}

/* Beautiful page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
