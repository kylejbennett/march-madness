async function getTournamentTeams() {
  try {
    const startDate = new Date('2026-03-19');
    const endDate = new Date('2026-03-24'); // pad it a bit
    let teams = new Map();
    let gamesCount = 0;

    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateStr}&limit=100`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.events) {
        data.events.forEach(event => {
          // ensure it's a postseason game (season type 3 usually)
          if (event.season.type === 3) {
            gamesCount++;
            const comps = event.competitions[0].competitors;
            comps.forEach(c => {
              if (!teams.has(c.team.id)) {
                teams.set(c.team.id, c.team.displayName);
              }
            });
          }
        });
      }
    }
    
    console.log(`Found ${gamesCount} postseason games in window.`);
    console.log(`Found ${teams.size} unique teams.`);
    const teamsArr = Array.from(teams.entries());
    console.log("Sample Teams:", teamsArr.slice(0, 10).map(t => `${t[1]} (${t[0]})`).join(', '));
  } catch (e) {
    console.error(e);
  }
}

getTournamentTeams();
