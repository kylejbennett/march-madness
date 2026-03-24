export const espnService = {
  /**
   * Fetches all tournament games and tallies the wins and losses
   * for the provided array of team objects.
   *
   * @param {Array} teams - The array of team objects to update
   */
  async updateTeamsWithLiveStats(teams) {
    try {
      // RESET ALL TEAM STATS TO ZERO! 
      // Because this service is repeatedly executed across various uncoupled Vue Router components (Overview, Bracket),
      // we absolutely must wipe the singleton state. Otherwise, navigating back and forth infinitely compounds team wins on top of themselves!
      teams.forEach(t => {
         t.wins = 0;
         t.losses = 0;
         t.eliminated = false;
      });

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

      const processedGames = new Set();
      
      // Process all games
      dailyResults.forEach(data => {
        if (!data.events) return;
        
        data.events.forEach(event => {
          // Prevent accidental ESPN API double counting across overlapped dates
          if (processedGames.has(event.id)) return;
          processedGames.add(event.id);

          // Build a safe descriptive search string from the embedded ESPN api notes
          const notesText = event.competitions[0].notes?.map(n => n.headline).join(" ") || "";
          
          // Check headline tags to exclude Conference Tournaments, the NIT, and Play-In matchups 
          // The 6-Round algorithmic bracket only functions precisely if it calculates exclusive 64-team round stats!
          const isNCAA = notesText.includes("NCAA");
          const isFirstFour = notesText.includes("First Four");

          if (event.season.type === 3 && isNCAA && !isFirstFour) {
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
                    team.losses += 1;
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
        const isNCAA = e.competitions[0].notes?.some(n => n.headline?.includes("NCAA"));
        return e.season.type === 3 && isNCAA;
      });
    } catch (err) {
      console.error("Failed to fetch games by date:", err);
      return [];
    }
  },

  /**
   * Fetches all tournament games for a specific team chronologically.
   * @param {string|number} espnId - The unique ESPN identifier for the team.
   */
  async fetchTeamSchedule(espnId) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${espnId}/schedule`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.events) return [];
      
      // Filter for chronological NCAA postseason games only (excluding First Four edge cases and Conf Tourneys)
      return data.events.filter(e => {
        const notesObj = e.competitions?.[0]?.notes;
        const notesStr = notesObj ? notesObj.map(n => n.headline).join(" ") : "";
        const isNCAA = notesStr.includes("NCAA");
        const isFirstFour = notesStr.includes("First Four");
        
        // Ensure it's legitimately tracking the 64-team matrix
        return isNCAA && !isFirstFour;
      });
    } catch (err) {
      console.error(`Failed to fetch team schedule for [${espnId}]:`, err);
      return [];
    }
  }
};
