import { getDatabase } from './lib/mongodb.js';

async function test() {
  const db = await getDatabase();
  const students = await db.collection('students').find().toArray();
  const fees = await db.collection('fees').find().toArray();
  
  console.log("Students count:", students.length);
  console.log("Fees count:", fees.length);
  
  console.log("Students matching afa:", students.filter(s => s.name?.toLowerCase().includes('afa')).map(s => ({name: s.name, branchId: s.branchId})));
  console.log("Fees matching afa:", fees.filter(f => f.studentName?.toLowerCase().includes('afa')).map(f => ({name: f.studentName, branchId: f.branchId})));
}

test().catch(console.error).finally(() => process.exit(0));
