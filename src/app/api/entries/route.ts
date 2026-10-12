import { NextRequest } from 'next/server';
import { listEntries, createEntry, updateEntry, deleteEntry } from '@/lib/sheets';
import { entrySchema, idSchema } from '@/lib/schemas';
import { blocked, responseError, ok } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const b = blocked(req);
  if (b) return b;
  try {
    return ok(await listEntries());
  } catch (e) {
    return responseError(e);
  }
}

export async function POST(req: NextRequest) {
  const b = blocked(req, true);
  if (b) return b;
  try {
    return ok(await createEntry(entrySchema.parse(await req.json())), 201);
  } catch (e) {
    return responseError(e);
  }
}

export async function PATCH(req: NextRequest) {
  const b = blocked(req, true);
  if (b) return b;
  try {
    const { id, ...rest } = await req.json();
    idSchema.parse({ id });
    return ok(await updateEntry(id, entrySchema.parse(rest)));
  } catch (e) {
    return responseError(e);
  }
}

export async function DELETE(req: NextRequest) {
  const b = blocked(req, true);
  if (b) return b;
  try {
    const { id } = idSchema.parse(await req.json());
    await deleteEntry(id);
    return ok({ success: true });
  } catch (e) {
    return responseError(e);
  }
}
