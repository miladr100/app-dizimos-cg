import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    return NextResponse.json({ error: 'A planilha ainda não foi configurada.' }, { status: 503 });
  }
  return NextResponse.redirect(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/edit`);
}
