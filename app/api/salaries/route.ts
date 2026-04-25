import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

const STAFF_FILE = 'staff.json';
const SALARIES_FILE = 'salaries_history.json';
const EXPENSES_FILE = 'expenses.json';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const history = await readData<any>(SALARIES_FILE);
    
    if (month && year) {
      return NextResponse.json(history.filter((h: any) => h.month === month && h.year === year));
    }
    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch salary history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { staffId, month, year, amount, note, offs, deduction } = await request.json();
    
    const staff = await readData<any>(STAFF_FILE);
    const employee = staff.find((s: any) => s.id === staffId);
    if (!employee) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

    // 1. Record Salary History
    const history = await readData<any>(SALARIES_FILE);
    const nextId = await generateId(SALARIES_FILE).catch(() => 1);
    
    const payment: any = {
      id: nextId,
      staffId,
      staffName: employee.name,
      designation: employee.designation,
      month,
      year,
      amount: parseFloat(amount),
      offsTaken: parseFloat(offs || '0'),
      deduction: parseFloat(deduction || '0'),
      paymentDate: new Date().toISOString(),
      note: note || 'Monthly Salary',
      expenseId: null
    };
    
    history.push(payment);
    await writeData(SALARIES_FILE, history);

    // 2. Automatically Log as Expense
    const expenses = await readData<any>(EXPENSES_FILE);
    const nextExpId = await generateId(EXPENSES_FILE);
    
    expenses.push({
      id: nextExpId,
      category: 'Salary',
      amount: parseFloat(amount),
      description: `Staff Salary: ${employee.name} (${month} ${year})`,
      date: new Date().toISOString()
    });
    
    await writeData(EXPENSES_FILE, expenses);

    // 3. Link back to history
    payment.expenseId = nextExpId;
    await writeData(SALARIES_FILE, history);

    return NextResponse.json({ success: true, payment });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to process salary' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    // 1. Get History
    const history = await readData<any>(SALARIES_FILE);
    const paymentIndex = history.findIndex((h: any) => h.id.toString() === id.toString());
    if (paymentIndex === -1) return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    const payment = history[paymentIndex];

    // 2. Remove Expense if exists
    if (payment.expenseId) {
      const expenses = await readData<any>(EXPENSES_FILE);
      const filteredExpenses = expenses.filter((e: any) => e.id.toString() !== payment.expenseId.toString());
      await writeData(EXPENSES_FILE, filteredExpenses);
    }

    // 3. Remove History Record
    const filteredHistory = history.filter((h: any) => h.id.toString() !== id.toString());
    await writeData(SALARIES_FILE, filteredHistory);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to reverse payment' }, { status: 500 });
  }
}
