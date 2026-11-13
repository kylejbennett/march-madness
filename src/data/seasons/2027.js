import { teams } from './2027.teams'
import { participants } from './2027.participants'

export const season2027 = {
  year: 2027,
  label: '2027',
  status: teams.length > 0 ? 'active' : 'upcoming',
  startDate: '2027-03-18',
  endDate: '2027-04-06',
  defaultMatchupDate: '2027-03-18',
  r64Dates: ['20270318', '20270319'],
  regionOrder: ['East', 'South', 'West', 'Midwest'],
  teams,
  participants,
}
