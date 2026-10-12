import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ConflictError, RecordMissingError } from './sheets';
import { permit } from './limit';

export function responseError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Confira os dados informados.', details: error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof RecordMissingError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error('Erro na API:', error);
  if (error instanceof Error && error.message.includes('ainda não foi configurada')) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  return NextResponse.json(
    { error: 'Não foi possível acessar a planilha. Verifique a configuração, as permissões e tente novamente.' },
    { status: 500 },
  );
}

export function blocked(request: Request, write = false) {
  return permit(request, write)
    ? null
    : NextResponse.json(
        { error: 'Muitas solicitações. Aguarde um minuto e tente novamente.' },
        { status: 429 },
      );
}

export const ok = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
