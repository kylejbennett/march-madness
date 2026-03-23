export const espnService = {
  /**
   * Fetches all tournament games and tallies the wins and losses
   * for the provided array of team objects.
   *
   * @param {Array} teams - The array of team objects to update
   */
  async updateTeamsWithLiveStats(teams) {
    try {
      const startDate = new Date('2026-03-19');
      // Set end date to today (or the end of the tournament if the season is over)
      const endDate = new Date(); 
      endDate.setHours(23, 59, 59);
      
      const fetchPromises = [];

      // Create a lookup map for faster team updates
      const teamMap = new Map(teams.map(t => [t.espnId, t]));

      // Queue up a fetch request for every day since the tournament started
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
        const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateStr}&limit=100`;
        fetchPromises.push(fetch(url).then(r => r.json()));
      }

      const dailyResults = await Promise.all(fetchPromises);

      // Process all games
      dailyResults.forEach(data => {
        if (!data.events) return;
        
        data.events.forEach(event => {
          // Ensure it is a postseason game
          if (event.season.type === 3) {
            const isCompleted = event.status.type.completed;
            const comps = event.competitions[0].competitors;

            if (isCompleted) {
              // Extract both competitors to determine winner/loser
              comps.forEach(comp => {
                const teamId = comp.team.id;
                const isWinner = comp.winner;
                
                const team = teamMap.get(teamId);
                if (team) {
                  if (isWinner) {
                    team.wins += 1;
                  } else {
                    team.losses = 1;
                    team.eliminated = true; // One loss and you're out
                  }
                }
              });
            }
          }
        });
      });
      
    } catch (err) {
      console.error("Failed to fetch live ESPN stats:", err);
    }
  }
};
