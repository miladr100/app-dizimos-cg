import { NextRequest } from 'next/server';
import { entrySchema, idSchema, postedSchema } from '@/lib/schemas';
import { listEntries, createEntry, updateEntry, deleteEntry, setEntryPosted } from '@/lib/sheets';
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
    const body = await req.json();
    if (body && typeof body === 'object' && 'posted' in body) {
      const parsed = postedSchema.parse(body);
      return ok(await setEntryPosted(parsed.id, parsed.posted));
    }
    const { id, ...rest } = body;
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
