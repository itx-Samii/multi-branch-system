const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

async function cleanOrphans() {
  try {
    const students = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'students.json'), 'utf8'));
    const studentIds = new Set(students.map(s => s.id.toString()));

    const fees = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'fees.json'), 'utf8'));
    const filteredFees = fees.filter(f => studentIds.has(f.studentId.toString()));

    fs.writeFileSync(path.join(DATA_DIR, 'fees.json'), JSON.stringify(filteredFees, null, 2));
    console.log(`Cleaned ${fees.length - filteredFees.length} orphan fee records.`);
  } catch (e) {
    console.error("Cleanup failed", e);
  }
}

cleanOrphans();
