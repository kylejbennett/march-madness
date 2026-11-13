# March Madness Pool Tracker - Context

## Application Overview
This is a Vue 3 application built with the Composition API and Vite. Its primary purpose is to track a March Madness pool played annually. The application will track participants and the college basketball teams they have drawn in the tournament, fetching live win/loss data to determine the pool standings.

## Technology Stack
- **Framework:** Vue 3 (Composition API)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v3 (integrated directly into Vue `<style scoped>` blocks via `@apply` directives)
- **Fonts:** *Inter* (Base UI Typography) & *Caveat* (Hand-drawn Tally Marks)
- **Data Source:** ESPN Scoreboard APIs

## Current State & Completed Features
- **Application Scaffold:** Initialized base Vue 3 + Vite application. Configured `npm run dev` to auto-open the browser.
- **Multi-Season Data Architecture:** Refactored pool data into season-keyed modules under `src/data/seasons/` (`2026.js`, `2027.js`, `index.js`) with a shared `useSeason` composable (`src/composables/useSeason.js`) and a season switcher in `NavBar.vue`. The 2026 pool is preserved as a completed archive while 2027 is staged as an upcoming season.
- **Season-Aware ESPN Fetching:** Updated `espnService.js` to bound date ranges to each season's `startDate`/`endDate`, cache games per season, and skip pre-tournament fetches. Parameterized `scripts/fetchTeams.js` (`npm run fetch-teams`) to generate year-specific team files with NCAA/non-First-Four filtering.
- **Dynamic Fetching & Views:** `Overview.vue`, `BracketView.vue`, `MatchupsView.vue`, `TeamsView.vue`, `MatchupCard.vue`, and `MatchupDetailPanel.vue` all reactively render the selected season and display clean empty states for upcoming unpopulated seasons.
- **Draft Board Mapping:** Read the physically written draft board image and perfectly mapped all 64 teams for 2026 to the 8 participants via ESPN IDs in `src/data/participants.js`.
- **User Interface:** Constructed a highly modern, responsive CSS-Grid based dashboard using Tailwind CSS with dynamic multi-way rank ties and hand-drawn tally marks.

## Planned Features / Upcoming Tasks
*(The MVP scope is currently fully complete! Any future features should be mapped here before development.)*

*(Note to future LLM contexts: Maintain and update this file whenever a major feature is completed or the application's core functionality/roadmap changes.)*
