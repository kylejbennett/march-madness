import { createRouter, createWebHistory } from 'vue-router'
import Overview from '../views/Overview.vue'
import MatchupsView from '../components/MatchupsView.vue'
import BracketView from '../views/BracketView.vue'
import TeamsView from '../views/TeamsView.vue'
import DraftView from '../views/DraftView.vue'
import Placeholder from '../views/Placeholder.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/overview' },
    { path: '/overview', name: 'Overview', component: Overview },
    { path: '/matchups', name: 'Matchups', component: MatchupsView },
    { path: '/bracket', name: 'Bracket', component: BracketView },
    { path: '/teams', name: 'Teams', component: TeamsView },
    { path: '/draft', name: 'Draft', component: DraftView }
  ]
})

export default router
