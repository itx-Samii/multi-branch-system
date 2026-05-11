import { NextResponse } from 'next/server';
import { readData, writeData, generateId } from '@/lib/fileHandler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const classes = await readData<any>('classes.json');
    
    const processedClasses = classes.map((c: any) => ({
      ...c,
      studentCount: 0 
    }));

    return NextResponse.json(processedClasses);
  } catch (err: any) {
    console.error("Local JSON Classes GET Error:", err);
    return NextResponse.json({ error: 'Failed to fetch classes', details: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, section, monthlyFee, annualCharges } = body;

    const classes = await readData<any>('classes.json');
    const newId = await generateId('classes.json');

    const newClass = {
      id: newId,
      name,
      section,
      monthlyFee: parseFloat(monthlyFee),
      annualCharges: parseFloat(annualCharges || 0)
    };

    classes.push(newClass);
    await writeData('classes.json', classes);

    return NextResponse.json(newClass);
  } catch (err: any) {
    console.error("Local JSON Classes POST Error:", err);
    return NextResponse.json({ error: 'Failed to create class', details: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const classes = await readData<any>('classes.json');
    const classIndex = classes.findIndex((c: any) => c.id.toString() === id.toString());
    
    if (classIndex === -1) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    classes[classIndex] = { ...classes[classIndex], ...updateData };
    await writeData('classes.json', classes);

    return NextResponse.json({ id, ...updateData });
  } catch (err: any) {
    console.error("Local JSON Classes PUT Error:", err);
    return NextResponse.json({ error: 'Failed to update class', details: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    let classes = await readData<any>('classes.json');
    classes = classes.filter((c: any) => c.id.toString() !== id.toString());
    await writeData('classes.json', classes);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Local JSON Classes DELETE Error:", err);
    return NextResponse.json({ error: 'Failed to delete class', details: err.message }, { status: 500 });
  }
}
