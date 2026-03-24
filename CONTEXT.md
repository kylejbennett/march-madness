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
- **Data Architecture:** Created data structures for the hard-coded pool in `src/data/teams.js` and `src/data/participants.js`.
- **Dynamic Fetching:** Wrote `fetchTeams.js` to initially generate the 64 tournament teams using ESPN APIs. Built Vue's `espnService.js` to pull live scoreboard updates every time the app loads and reliably tally wins and eliminations.
- **Draft Board Mapping:** Read the physically written draft board image and perfectly mapped all 64 teams to the 8 participants via ESPN IDs in `participants.js`.
- **User Interface:** Constructed a highly modern, responsive CSS-Grid based dashboard using Tailwind CSS. 
  - Segmented the app cleanly into `App.vue`, `ParticipantCard.vue`, and `TeamRow.vue`.
  - Implemented dynamic logic to handle multi-way Rank Ties perfectly.
  - Used hand-drawn custom fonts to convert raw win-numbers into authentic hash marks (tally marks) locally per team.

## Planned Features / Upcoming Tasks
*(The MVP scope is currently fully complete! Any future features should be mapped here before development.)*

*(Note to future LLM contexts: Maintain and update this file whenever a major feature is completed or the application's core functionality/roadmap changes.)*
