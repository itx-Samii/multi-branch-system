const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

async function removeTestSalary() {
  try {
    // 1. Remove from salaries_history.json
    const historyPath = path.join(DATA_DIR, 'salaries_history.json');
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    
    // Find the IDs of the salaries to remove
    const toRemove = history.filter(h => h.staffName === 'Test');
    const remainingHistory = history.filter(h => h.staffName !== 'Test');
    
    fs.writeFileSync(historyPath, JSON.stringify(remainingHistory, null, 2));
    console.log(`Removed ${toRemove.length} salary records for 'Test'.`);

    // 2. Remove from expenses.json
    const expensePath = path.join(DATA_DIR, 'expenses.json');
    const expenses = JSON.parse(fs.readFileSync(expensePath, 'utf8'));
    
    // Salary expenses usually have description like "Salary - StaffName - Month Year"
    const remainingExpenses = expenses.filter(e => !(e.category === 'Salary' && e.description.includes('Test')));
    
    fs.writeFileSync(expensePath, JSON.stringify(remainingExpenses, null, 2));
    console.log(`Removed corresponding expense records.`);

  } catch (e) {
    console.error("Manual removal failed", e);
  }
}

removeTestSalary();
