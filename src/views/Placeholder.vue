<script setup>
defineProps({
  title: String
})
</script>

<template>
  <div class="placeholder-view animate-fade-in">
    <div class="placeholder-card">
      <svg class="w-12 h-12 mx-auto text-accent-base/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
      <h2 class="text-2xl font-semibold text-zinc-200 mb-2">{{ title }} View</h2>
      <p class="text-zinc-400">This dedicated dashboard specifically for {{ title }} is coming soon!</p>
    </div>
  </div>
</template>

<style scoped>
.placeholder-view {
  @apply flex items-center justify-center min-h-[40vh];
}

.placeholder-card {
  @apply bg-glass-bg backdrop-blur-md border border-glass-border rounded-xl p-12 text-center max-w-lg w-full shadow-2xl;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
