async function check() {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=20260319-20260406&limit=150`;
  const res = await fetch(url);
  const data = await res.json();
  console.log("Events:", data.events?.length);
}
check();
