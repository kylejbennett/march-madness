const tournamentGamesBySeason = new Map();
const activeUpdatePromises = new Map();

function applyStatsFromGames(teams, games) {
  const teamMap = new Map(teams.map(t => [String(t.espnId), t]));

  games.forEach(event => {
    const isCompleted = event.status?.type?.completed;
    const comps = event.competitions?.[0]?.competitors || [];

    if (isCompleted) {
      comps.forEach(comp => {
        const teamId = String(comp.team.id);
        const isWinner = comp.winner;

        const team = teamMap.get(teamId);
        if (team) {
          if (isWinner) {
            team.wins += 1;
          } else {
            team.losses += 1;
            team.eliminated = true;
          }
        }
      });
    }
  });
}

export const espnService = {
  /**
   * Fetches all tournament games for a given season and tallies the wins and losses
   * for the provided array of team objects.
   *
   * @param {Array} teams - The array of team objects to update
   * @param {Object} season - Season configuration object ({ year, startDate, endDate })
   */
  async updateTeamsWithLiveStats(teams, season) {
    if (!teams || teams.length === 0 || !season) return;

    const seasonKey = season.year;

    const doUpdate = async () => {
      try {
        // Reset team stats before tallying to prevent compounding on re-navigation
        teams.forEach(t => {
          t.wins = 0;
          t.losses = 0;
          t.eliminated = false;
        });

        const startDate = new Date(season.startDate);
        const maxEndDate = new Date(season.endDate);
        maxEndDate.setHours(23, 59, 59, 999);

        const now = new Date();
        // Tournament has not started yet
        if (now < startDate) {
          tournamentGamesBySeason.set(seasonKey, []);
          return;
        }

        // Reuse cached games for completed seasons so switching tabs/seasons is instant
        if (season.status === 'completed' && tournamentGamesBySeason.has(seasonKey)) {
          applyStatsFromGames(teams, tournamentGamesBySeason.get(seasonKey));
          return;
        }

        const endDate = now < maxEndDate ? now : maxEndDate;
        endDate.setHours(23, 59, 59, 999);

        const fetchPromises = [];

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
          const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateStr}&limit=100`;
          fetchPromises.push(fetch(url).then(r => r.json()));
        }

        const dailyResults = await Promise.all(fetchPromises);
        const processedGames = new Set();
        const seasonGames = [];

        dailyResults.forEach(data => {
          if (!data.events) return;

          data.events.forEach(event => {
            if (processedGames.has(event.id)) return;
            processedGames.add(event.id);

            const notesText = event.competitions?.[0]?.notes?.map(n => n.headline).join(" ") || "";
            const isNCAA = notesText.includes("NCAA");
            const isFirstFour = notesText.includes("First Four");

            if (event.season?.type === 3 && isNCAA && !isFirstFour) {
              seasonGames.push(event);
            }
          });
        });

        tournamentGamesBySeason.set(seasonKey, seasonGames);
        applyStatsFromGames(teams, seasonGames);
      } catch (err) {
        console.error(`Failed to fetch live ESPN stats for ${seasonKey}:`, err);
      }
    };

    const promise = doUpdate();
    activeUpdatePromises.set(seasonKey, promise);
    await promise;
  },

  /**
   * Fetches all games for a specific date string (YYYYMMDD).
   */
  async fetchGamesByDate(dateString) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateString}&limit=100`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.events) return [];

      // Filter for NCAA postseason games only
      return data.events.filter(e => {
        const isNCAA = e.competitions?.[0]?.notes?.some(n => n.headline?.includes("NCAA"));
        return e.season?.type === 3 && isNCAA;
      });
    } catch (err) {
      console.error("Failed to fetch games by date:", err);
      return [];
    }
  },

  /**
   * Fetches all tournament games for a specific team chronologically within a season.
   * @param {string|number} espnId - The unique ESPN identifier for the team.
   * @param {number} seasonYear - The season year to query.
   */
  async fetchTeamSchedule(espnId, seasonYear) {
    try {
      const pending = activeUpdatePromises.get(seasonYear);
      if (pending) {
        await pending;
      }

      const seasonGames = tournamentGamesBySeason.get(seasonYear) || [];
      const games = seasonGames.filter(e => {
        const comps = e.competitions?.[0]?.competitors || [];
        return comps.some(c => String(c.team.id) === String(espnId));
      });

      return games.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (err) {
      console.error(`Failed to fetch team schedule for [${espnId}] (${seasonYear}):`, err);
      return [];
    }
  }
};
