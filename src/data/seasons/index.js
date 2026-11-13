import { season2026 } from './2026'
import { season2027 } from './2027'

// Ordered newest first
export const seasons = [season2027, season2026]

// Default to the newest season that already has tournament teams populated
export const DEFAULT_SEASON_YEAR =
  seasons.find(s => s.teams.length > 0)?.year ?? seasons[0].year

export function getSeason(year) {
  const numYear = Number(year)
  return seasons.find(s => s.year === numYear) || seasons.find(s => s.year === DEFAULT_SEASON_YEAR)
}
