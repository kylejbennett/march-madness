# March Madness Pool Tracker - Context

## Application Overview
This is a Vue 3 application built with the Composition API and Vite. Its primary purpose is to track a March Madness pool played annually. The application will track participants and the college basketball teams they have drawn in the tournament, fetching live win/loss data to determine the pool standings.

## Technology Stack
- **Framework:** Vue 3 (Composition API)
- **Build Tool / Scaffolding:** Vite
- **Styling:** TBD (Standard CSS by default)
- **Data Source:** ESPN APIs or web scraping (planned)

## Current State & Completed Features
- Initialized base Vue 3 + Vite shell application in the repository.
- Modified `package.json` to automatically open the default browser (`vite --open`) when starting the dev server (`npm.cmd run dev`).
- Scaffolded data structures for the hard-coded participants and teams in `src/data/teams.js` and `src/data/participants.js`.

## Current State & Completed Features
- Initialized base Vue 3 + Vite shell application in the repository.
- Modified `package.json` to automatically open the default browser (`vite --open`) when starting the dev server (`npm.cmd run dev`).
- Scaffolded data structures for the hard-coded participants and teams in `src/data/teams.js` and `src/data/participants.js`.
- Implemented `fetchTeams.js` script to auto-generate the 64 real teams into `teams.js` using ESPN APIs.
- Implemented `espnService.js` to dynamically fetch live game scores every time the app loads and calculate participant wins.
- Extracted drafted teams from the user-provided draft-board image and mapped them in `participants.js`.
- Custom-built `App.vue` and `main.css` to render an incredibly modern dark-themed dashboard that calculates participant rankings and gracefully visualizes the "8-column" physical draft sheet.

## Planned Features / Upcoming Tasks
*(The MVP scope is currently fully complete! If you want to add brackets, database persistence, or historical tracking, drop the plans here first.)*

*(Note to future LLM contexts: Maintain and update this file whenever a major feature is completed or the application's core functionality/roadmap changes.)*
