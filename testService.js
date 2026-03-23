import { espnService } from './src/services/espnService.js';
import { teams } from './src/data/teams.js';

async function test() {
  // Let's print out the status of a few teams before the update
  const sampleTeam = teams.find(t => t.name === "Purdue Boilermakers");
  console.log(`Before: ${sampleTeam.name} - ${sampleTeam.wins}W-${sampleTeam.losses}L`);
  
  await espnService.updateTeamsWithLiveStats(teams);
  
  console.log(`After: ${sampleTeam.name} - ${sampleTeam.wins}W-${sampleTeam.losses}L, Eliminated: ${sampleTeam.eliminated}`);

  const winners = teams.filter(t => t.wins > 0);
  console.log(`Found ${winners.length} teams with at least 1 win!`);
}

test();
