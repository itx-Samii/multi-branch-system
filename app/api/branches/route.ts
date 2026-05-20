import { NextResponse } from 'next/server';
import { readData, writeData, generateId, getTenantId } from '@/lib/dbHandler';

export const dynamic = 'force-dynamic';

// Auto-seed default "Main Campus" if no branches exist
async function ensureDefaultBranch(schoolId: string) {
  const branches = await readData<any>('branches.json', schoolId);
  if (branches.length === 0) {
    const defaultBranch = {
      id: 'branch_main',
      schoolId,
      branchId: 'branch_main',
      name: 'Main Campus',
      code: 'MC',
      address: '',
      phone: '',
      isDefault: true,
      createdAt: new Date().toISOString(),
    };
    await writeData('branches.json', [defaultBranch], schoolId);
    return [defaultBranch];
  }
  return branches;
}

export async function GET() {
  const schoolId = await getTenantId();
  try {
    const branches = await ensureDefaultBranch(schoolId);
    const response = NextResponse.json(branches);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch branches', details: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const schoolId = await getTenantId();
  try {
    const body = await request.json();
    const { name, code, address, phone } = body;
    if (!name || !code) {
      return NextResponse.json({ error: 'Branch name and code are required' }, { status: 400 });
    }

    const branches = await ensureDefaultBranch(schoolId);

    // Check duplicate code
    const existing = branches.find((b: any) => b.code?.toLowerCase() === code.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'A branch with this code already exists' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const branchId = `branch_${cleanCode.toLowerCase()}_${Math.random().toString(36).substring(2, 6)}`;

    const newBranch = {
      id: branchId,
      schoolId,
      branchId,
      name: name.trim(),
      code: cleanCode,
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    branches.push(newBranch);
    await writeData('branches.json', branches, schoolId);

    return NextResponse.json(newBranch);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create branch', details: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const schoolId = await getTenantId();
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });

    const branches = await readData<any>('branches.json', schoolId);
    const idx = branches.findIndex((b: any) => b.id === id || b.branchId === id);
    if (idx === -1) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    branches[idx] = { ...branches[idx], ...updateData, updatedAt: new Date().toISOString() };
    await writeData('branches.json', branches, schoolId);

    return NextResponse.json(branches[idx]);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update branch', details: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const schoolId = await getTenantId();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });

    const branches = await readData<any>('branches.json', schoolId);
    const branch = branches.find((b: any) => b.id === id || b.branchId === id);

    if (branch?.isDefault) {
      return NextResponse.json({ error: 'Cannot delete the Main Campus / default branch' }, { status: 400 });
    }

    const updated = branches.filter((b: any) => b.id !== id && b.branchId !== id);
    await writeData('branches.json', updated, schoolId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete branch', details: err.message }, { status: 500 });
  }
}
