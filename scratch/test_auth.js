const run = async () => {
  const r1 = await fetch('https://vedavyas1235-animateit.hf.space/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer SuPer@07#Man001@2#3$5' },
    body: JSON.stringify({ html: 'test' })
  });
  console.log("No quotes:", await r1.json());

  const r2 = await fetch('https://vedavyas1235-animateit.hf.space/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer "SuPer@07#Man001@2#3$5"' },
    body: JSON.stringify({ html: 'test' })
  });
  console.log("With quotes:", await r2.json());
}
run();
