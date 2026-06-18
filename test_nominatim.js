const fetch = require('node-fetch'); // wait, fetch is global in Node 18+

async function test() {
  const response = await fetch('https://nominatim.openstreetmap.org/search?q=123+Main+St&format=json&addressdetails=1&limit=5', {
    headers: { 'User-Agent': 'MoveApp/1.0' }
  });
  const data = await response.json();
  console.log(JSON.stringify(data[0], null, 2));
  console.log('Parsed lat:', parseFloat(data[0].lat));
  console.log('Parsed lon:', parseFloat(data[0].lon));
}
test();
