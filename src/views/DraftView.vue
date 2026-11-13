<script setup>
import { ref, computed, watch } from 'vue'
import { useSeason } from '../composables/useSeason'

const { currentSeason, historicalParticipantNames, saveSeason, isRemoteWriteEnabled } = useSeason()

const draftParticipants = ref([])
const selectedParticipantIdx = ref(0)
const newParticipantName = ref('')
const teamSearch = ref('')
const hideDrafted = ref(true)
const adminPassword = ref(sessionStorage.getItem('pool_admin_password') || '')
const isEditing = ref(false)
const isSaving = ref(false)
const saveMessage = ref('')
const saveError = ref('')

const syncFromSeason = (season) => {
  draftParticipants.value = (season?.participants || []).map((p, idx) => ({
    id: p.id || idx + 1,
    name: p.name || '',
    teamIds: Array.isArray(p.teamIds) ? p.teamIds.map(String) : [],
  }))
  selectedParticipantIdx.value = 0
  isEditing.value = false
  saveMessage.value = ''
  saveError.value = ''
}

const cancelEditing = () => {
  syncFromSeason(currentSeason.value)
}

watch(currentSeason, syncFromSeason, { immediate: true })

const teams = computed(() => currentSeason.value?.teams || [])

const teamById = computed(() => {
  const map = new Map()
  teams.value.forEach(t => map.set(String(t.espnId), t))
  return map
})

const ownerByTeamId = computed(() => {
  const map = new Map()
  draftParticipants.value.forEach(p => {
    p.teamIds.forEach(id => map.set(String(id), p.name || 'Unnamed'))
  })
  return map
})

const totalDraftedCount = computed(() => ownerByTeamId.value.size)

const selectedParticipant = computed(() => {
  return draftParticipants.value[selectedParticipantIdx.value] || null
})

const filteredTeams = computed(() => {
  const q = teamSearch.value.trim().toLowerCase()
  return [...teams.value]
    .sort((a, b) => (a.seed || 99) - (b.seed || 99) || a.name.localeCompare(b.name))
    .filter(t => {
      const isDrafted = ownerByTeamId.value.has(String(t.espnId))
      if (hideDrafted.value && isDrafted) return false
      if (!q) return true
      return t.name.toLowerCase().includes(q) || String(t.seed) === q
    })
})

const addParticipantByName = (rawName) => {
  const name = rawName.trim()
  if (!name) return
  const alreadyAdded = draftParticipants.value.some(
    p => p.name.trim().toLowerCase() === name.toLowerCase()
  )
  if (alreadyAdded) return
  draftParticipants.value.push({
    id: draftParticipants.value.length + 1,
    name,
    teamIds: [],
  })
  selectedParticipantIdx.value = draftParticipants.value.length - 1
}

const addParticipant = () => {
  addParticipantByName(newParticipantName.value)
  newParticipantName.value = ''
}

const availablePastParticipants = computed(() => {
  const currentNames = new Set(
    draftParticipants.value.map(p => p.name.trim().toLowerCase()).filter(Boolean)
  )
  return historicalParticipantNames.value.filter(
    name => !currentNames.has(name.toLowerCase())
  )
})

const addAllPastParticipants = () => {
  availablePastParticipants.value.forEach(name => addParticipantByName(name))
}

const removeParticipant = (idx) => {
  draftParticipants.value.splice(idx, 1)
  draftParticipants.value.forEach((p, i) => { p.id = i + 1 })
  if (selectedParticipantIdx.value >= draftParticipants.value.length) {
    selectedParticipantIdx.value = Math.max(0, draftParticipants.value.length - 1)
  }
}

const moveParticipant = (idx, direction) => {
  const targetIdx = idx + direction
  if (targetIdx < 0 || targetIdx >= draftParticipants.value.length) return
  const list = [...draftParticipants.value]
  const [moved] = list.splice(idx, 1)
  list.splice(targetIdx, 0, moved)
  list.forEach((p, i) => { p.id = i + 1 })
  draftParticipants.value = list
  if (selectedParticipantIdx.value === idx) {
    selectedParticipantIdx.value = targetIdx
  } else if (selectedParticipantIdx.value === targetIdx) {
    selectedParticipantIdx.value = idx
  }
}

const assignTeam = (team) => {
  const active = selectedParticipant.value
  if (!active) return
  const espnId = String(team.espnId)

  // Remove from any previous owner if reassigned
  draftParticipants.value.forEach(p => {
    p.teamIds = p.teamIds.filter(id => id !== espnId)
  })

  active.teamIds.push(espnId)
}

const unassignTeam = (participantIdx, espnId) => {
  const p = draftParticipants.value[participantIdx]
  if (!p) return
  p.teamIds = p.teamIds.filter(id => id !== String(espnId))
}

const buildSeasonPayload = () => {
  const normalizedParticipants = draftParticipants.value.map((p, idx) => ({
    id: idx + 1,
    name: p.name.trim() || `Player ${idx + 1}`,
    teamIds: [...p.teamIds],
  }))

  return {
    ...currentSeason.value,
    participants: normalizedParticipants,
  }
}

const handleSaveToS3 = async () => {
  isSaving.value = true
  saveMessage.value = ''
  saveError.value = ''
  try {
    const payload = buildSeasonPayload()
    await saveSeason(payload, adminPassword.value)
    sessionStorage.setItem('pool_admin_password', adminPassword.value)
    isEditing.value = false
    saveMessage.value = `Saved ${payload.label} season to S3.`
  } catch (err) {
    saveError.value = err.message || 'Failed to save to S3.'
    if (err.message?.toLowerCase().includes('unauthorized')) {
      sessionStorage.removeItem('pool_admin_password')
    }
  } finally {
    isSaving.value = false
  }
}

const handleDownloadJson = () => {
  const payload = buildSeasonPayload()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${payload.year}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="wrapper animate-fade-in max-w-[1600px] mx-auto px-4 pb-16">
    <!-- Top Action Bar -->
    <div class="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-glass-bg border border-glass-border rounded-2xl p-5 backdrop-blur-md">
      <div>
        <h2 class="text-2xl font-black text-white uppercase tracking-wider">
          {{ currentSeason.label }} Draft Board
        </h2>
        <p class="text-sm text-zinc-400 mt-1">
          {{ draftParticipants.length }} participants · {{ totalDraftedCount }} / {{ teams.length || 64 }} teams drafted
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          v-if="!isEditing"
          type="button"
          class="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-glass-border transition-all"
          title="Edit Draft"
          aria-label="Edit Draft"
          @click="isEditing = true"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        <template v-else>
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-zinc-200 border border-glass-border transition-all"
            @click="handleDownloadJson"
          >
            Download JSON
          </button>

          <input
            v-if="isRemoteWriteEnabled"
            v-model="adminPassword"
            type="password"
            placeholder="Admin password"
            autocomplete="current-password"
            class="px-3 py-2 rounded-xl text-xs bg-zinc-900/80 border border-glass-border text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-accent-base w-40"
          />

          <button
            type="button"
            :disabled="!isRemoteWriteEnabled || !adminPassword || isSaving"
            class="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-accent-base hover:bg-accent-base/90 text-white shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            :title="!isRemoteWriteEnabled ? 'Configure VITE_POOL_API_URL and VITE_POOL_API_KEY to enable cloud save' : (!adminPassword ? 'Enter admin password to save' : '')"
            @click="handleSaveToS3"
          >
            {{ isSaving ? 'Saving...' : 'Save to S3' }}
          </button>

          <button
            type="button"
            class="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all"
            @click="cancelEditing"
          >
            Cancel
          </button>
        </template>
      </div>
    </div>

    <!-- Status Banners -->
    <div v-if="saveMessage" class="mb-6 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium">
      {{ saveMessage }}
    </div>
    <div v-if="saveError" class="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-medium">
      {{ saveError }}
    </div>
    <div v-if="isEditing && !isRemoteWriteEnabled" class="mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
      Cloud save is disabled because <code class="font-mono">VITE_POOL_API_URL</code> / <code class="font-mono">VITE_POOL_API_KEY</code> are not set. You can still use <strong>Download JSON</strong>.
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Column: Participants & Draft Order -->
      <section :class="isEditing ? 'lg:col-span-5' : 'lg:col-span-12'" class="space-y-4">
        <div class="bg-glass-bg border border-glass-border rounded-2xl p-4">
          <h3 class="text-sm font-bold uppercase tracking-widest text-zinc-300 mb-3">
            Participants &amp; Draft Order
          </h3>

          <form v-if="isEditing" class="flex gap-2 mb-4" @submit.prevent="addParticipant">
            <input
              v-model="newParticipantName"
              type="text"
              placeholder="Add participant name..."
              class="flex-1 px-3 py-2 bg-zinc-900/80 border border-glass-border rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-accent-base"
            />
            <button
              type="submit"
              class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-accent-base text-white hover:bg-accent-base/90 transition-all"
            >
              Add
            </button>
          </form>

          <!-- Quick Add from Past Pools -->
          <div v-if="isEditing && availablePastParticipants.length > 0" class="mb-4 p-3 rounded-xl bg-black/25 border border-glass-border">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[0.65rem] font-bold uppercase tracking-widest text-zinc-400">
                Past Participants
              </span>
              <button
                type="button"
                class="text-[0.65rem] font-bold uppercase tracking-wider text-accent-base hover:underline"
                @click="addAllPastParticipants"
              >
                Add All
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="name in availablePastParticipants"
                :key="name"
                type="button"
                class="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 hover:bg-accent-base/20 hover:text-white hover:border-accent-base/50 text-zinc-300 border border-glass-border transition-all"
                @click="addParticipantByName(name)"
              >
                + {{ name }}
              </button>
            </div>
          </div>

          <div v-if="draftParticipants.length === 0" class="text-sm text-zinc-500 py-6 text-center">
            No participants yet.
            <span v-if="isEditing">Select past participants or add a new name above.</span>
            <span v-else>Click the edit icon above to set up the draft.</span>
          </div>

          <div :class="isEditing ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'">
            <div
              v-for="(p, idx) in draftParticipants"
              :key="idx"
              class="rounded-xl border p-3 transition-all"
              :class="[
                isEditing ? 'cursor-pointer' : '',
                isEditing && selectedParticipantIdx === idx ? 'bg-accent-base/10 border-accent-base/60 ring-1 ring-accent-base/40' : 'bg-black/30 border-glass-border',
                isEditing && selectedParticipantIdx !== idx ? 'hover:border-white/20' : ''
              ]"
              @click="isEditing && (selectedParticipantIdx = idx)"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="text-xs font-black text-accent-base w-6">#{{ idx + 1 }}</span>
                  <input
                    v-if="isEditing"
                    v-model="p.name"
                    type="text"
                    class="bg-transparent text-sm font-bold text-white focus:outline-none focus:border-b focus:border-accent-base flex-1 min-w-0"
                    @click.stop
                  />
                  <span v-else class="text-sm font-bold text-white truncate">{{ p.name }}</span>
                </div>

                <div class="flex items-center gap-1" @click.stop>
                  <span class="text-xs font-semibold text-zinc-400 mr-2">{{ p.teamIds.length }} teams</span>
                  <template v-if="isEditing">
                    <button
                      type="button"
                      :disabled="idx === 0"
                      class="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
                      title="Move Up"
                      @click="moveParticipant(idx, -1)"
                    >↑</button>
                    <button
                      type="button"
                      :disabled="idx === draftParticipants.length - 1"
                      class="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
                      title="Move Down"
                      @click="moveParticipant(idx, 1)"
                    >↓</button>
                    <button
                      type="button"
                      class="p-1 text-zinc-500 hover:text-rose-400"
                      title="Remove Participant"
                      @click="removeParticipant(idx)"
                    >×</button>
                  </template>
                </div>
              </div>

              <!-- Drafted Teams -->
              <div v-if="p.teamIds.length > 0" class="mt-2.5 flex flex-wrap gap-1.5">
                <span
                  v-for="teamId in p.teamIds"
                  :key="teamId"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/90 border border-white/10 text-xs text-zinc-200"
                >
                  <span class="text-[0.65rem] font-bold text-accent-base">{{ teamById.get(String(teamId))?.seed ?? '?' }}</span>
                  <span>{{ teamById.get(String(teamId))?.name || teamId }}</span>
                  <button
                    v-if="isEditing"
                    type="button"
                    class="text-zinc-500 hover:text-rose-400 ml-0.5 font-bold"
                    @click.stop="unassignTeam(idx, teamId)"
                  >×</button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: Tournament Teams Pool -->
      <section v-if="isEditing" class="lg:col-span-7">
        <div class="bg-glass-bg border border-glass-border rounded-2xl p-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-sm font-bold uppercase tracking-widest text-zinc-300">
                Available Teams
              </h3>
              <p v-if="selectedParticipant" class="text-xs text-zinc-400 mt-0.5">
                Assigning picks to: <span class="text-accent-base font-bold">{{ selectedParticipant.name }}</span>
              </p>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                <input v-model="hideDrafted" type="checkbox" class="rounded accent-accent-base" />
                Hide drafted
              </label>
              <input
                v-model="teamSearch"
                type="text"
                placeholder="Search team or seed..."
                class="px-3 py-1.5 bg-zinc-900/80 border border-glass-border rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-accent-base"
              />
            </div>
          </div>

          <div v-if="teams.length === 0" class="text-center py-16 px-4 border border-dashed border-glass-border rounded-xl">
            <p class="text-base font-bold text-white mb-1">No Tournament Teams Loaded for {{ currentSeason.label }}</p>
            <p class="text-xs text-zinc-400 max-w-md mx-auto">
              You can still set up and save the participants and draft order now. Once Selection Sunday arrives and the 64 teams are generated, they will appear here for drafting.
            </p>
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[65vh] overflow-y-auto pr-1">
            <button
              v-for="team in filteredTeams"
              :key="team.espnId"
              type="button"
              :disabled="!selectedParticipant"
              class="flex flex-col items-center text-center p-2.5 rounded-xl border border-glass-border bg-black/30 hover:border-accent-base/60 hover:bg-accent-base/10 transition-all disabled:opacity-40"
              @click="assignTeam(team)"
            >
              <div class="flex items-center justify-between w-full mb-1">
                <span class="text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">#{{ team.seed }}</span>
                <span
                  v-if="ownerByTeamId.get(String(team.espnId))"
                  class="text-[0.6rem] font-bold uppercase text-accent-base truncate max-w-[70px]"
                >
                  {{ ownerByTeamId.get(String(team.espnId)) }}
                </span>
              </div>
              <img v-if="team.logo" :src="team.logo" class="w-10 h-10 object-contain mb-1.5" />
              <span class="text-xs font-semibold text-zinc-100 leading-tight line-clamp-2">{{ team.name }}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
