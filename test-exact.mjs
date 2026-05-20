import { GET } from './app/api/fees/route.ts';

async function test() {
  const req = new Request('http://localhost:3000/api/fees?search=' + encodeURIComponent('Zain ul Abideen'));
  const res = await GET(req);
  const data = await res.json();
  console.log("Returned data count for 'Zain ul Abideen':", data.length);
  if (data.length > 0) {
    console.log("First item:", { id: data[0].id, name: data[0].studentName, status: data[0].status });
  } else {
    console.log("Returned data:", data);
  }
}

test().catch(console.error).finally(() => process.exit(0));
