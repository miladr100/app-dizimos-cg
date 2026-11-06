import { google, sheets_v4 } from 'googleapis';
import { randomUUID } from 'node:crypto';
import { Member, Entry, MemberCategory } from './types';

const sheetId = process.env.GOOGLE_SHEET_ID;
const sheetNames = { members: 'Membros', entries: 'Dizimos' } as const;
const headers = {
  members: ['NOME', 'CATEGORIA', '_APP_ID'],
  entries: [
    'DATA',
    'NOME',
    'REFERÊNCIA',
    'VALOR',
    'CATEGORIA',
    'FORMA DE PAGAMENTO',
    'DATA LANÇAMENTO',
    'LANÇADO',
    '_APP_ID',
  ],
} as const;

function client() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key || !sheetId) {
    throw new Error('A integração Google Sheets ainda não foi configurada. Confira .env.local.');
  }
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

const range = (type: 'members' | 'entries', a1: string) => `'${sheetNames[type]}'!${a1}`;

async function ensurePostedColumns(api: sheets_v4.Sheets) {
  const current = await api.spreadsheets.values.get({
    spreadsheetId: sheetId!,
    range: range('entries', 'A1:I1'),
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const header = ((current.data.values?.[0] ?? []) as (string | number)[]).map((value) =>
    String(value ?? '').trim().toLocaleUpperCase('pt-BR'),
  );
  const business = ['DATA', 'NOME', 'REFERÊNCIA', 'VALOR', 'CATEGORIA', 'FORMA DE PAGAMENTO'];
  if (business.some((name, index) => header[index] !== name)) return;
  if (header[6] === 'DATA LANÇAMENTO' && header[7] === 'LANÇADO') return;
  if (header[6] !== '_APP_ID') {
    throw new Error('Confira os cabeçalhos da aba Dizimos. Não foi possível criar DATA LANÇAMENTO e LANÇADO.');
  }
  const stored = await api.spreadsheets.values.get({
    spreadsheetId: sheetId!,
    range: range('entries', 'G2:G'),
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const ids = ((stored.data.values ?? []) as (string | number)[][]).map((row) => [row?.[0] ?? '']);
  if (ids.length) {
    await api.spreadsheets.values.update({
      spreadsheetId: sheetId!,
      range: range('entries', `I2:I${ids.length + 1}`),
      valueInputOption: 'RAW',
      requestBody: { values: ids },
    });
  }
  await api.spreadsheets.values.update({
    spreadsheetId: sheetId!,
    range: range('entries', 'G1:I1'),
    valueInputOption: 'RAW',
    requestBody: { values: [['DATA LANÇAMENTO', 'LANÇADO', '_APP_ID']] },
  });
  if (ids.length) {
    await api.spreadsheets.values.clear({
      spreadsheetId: sheetId!,
      range: range('entries', `G2:G${ids.length + 1}`),
    });
  }
}

async function readRaw(api: sheets_v4.Sheets, type: 'members' | 'entries') {
  const result = await api.spreadsheets.values.get({
    spreadsheetId: sheetId!,
    range: range(type, type === 'members' ? 'A:C' : 'A:I'),
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });
  return (result.data.values ?? []) as (string | number)[][];
}

async function ensureIds(api: sheets_v4.Sheets, type: 'members' | 'entries') {
  if (type === 'entries') await ensurePostedColumns(api);
  const data = await readRaw(api, type);
  const cols = type === 'members' ? 3 : 9;
  const expected = headers[type];
  if (
    !data.length ||
    expected.slice(0, cols - 1).some((v, i) => String(data[0]?.[i] ?? '').trim().toLocaleUpperCase('pt-BR') !== v)
  ) {
    throw new Error(`Confira os cabeçalhos da aba ${sheetNames[type]}.`);
  }
  const ids = new Set<string>();
  const pending: { range: string; values: string[][] }[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row.slice(0, cols - 1).some((v) => String(v ?? '').trim())) continue;
    let id = String(row[cols - 1] ?? '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id) || ids.has(id)) {
      id = randomUUID();
      pending.push({
        range: range(type, `${String.fromCharCode(64 + cols)}${i + 1}`),
        values: [[id]],
      });
    }
    ids.add(id);
    row[cols - 1] = id;
  }
  if (String(data[0]?.[cols - 1] ?? '') !== '_APP_ID') {
    pending.unshift({
      range: range(type, `${String.fromCharCode(64 + cols)}1`),
      values: [['_APP_ID']],
    });
  }
  if (pending.length) {
    await api.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId!,
      requestBody: { valueInputOption: 'RAW', data: pending },
    });
  }
  // Esconde somente as colunas auxiliares, sem modificar as colunas de negócio.
  if (pending.length) {
    try {
      const meta = await api.spreadsheets.get({
        spreadsheetId: sheetId!,
        fields: 'sheets(properties(sheetId,title))',
      });
      const sheet = meta.data.sheets?.find((s) => s.properties?.title === sheetNames[type]);
      if (sheet?.properties?.sheetId !== undefined) {
        await api.spreadsheets.batchUpdate({
          spreadsheetId: sheetId!,
          requestBody: {
            requests: [
              {
                updateDimensionProperties: {
                  range: {
                    sheetId: sheet.properties.sheetId,
                    dimension: 'COLUMNS',
                    startIndex: cols - 1,
                    endIndex: cols,
                  },
                  properties: { hiddenByUser: true },
                  fields: 'hiddenByUser',
                },
              },
            ],
          },
        });
      }
    } catch {
      /* Sem permissão de formatação: os identificadores continuam funcionando. */
    }
  }
  return data;
}

function memRow(r: (string | number)[]): Member {
  return { id: String(r[2]), name: String(r[0]), category: String(r[1]) as MemberCategory };
}

function dateIso(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const s = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  return s;
}

function entryRow(r: (string | number)[]): Entry {
  return {
    id: String(r[8]),
    date: dateIso(r[0]),
    name: String(r[1] ?? ''),
    reference: String(r[2] ?? ''),
    amount: Number(r[3] ?? 0),
    category: String(r[4] ?? ''),
    payment: String(r[5] ?? ''),
    postedOn: isoDateOrEmpty(r[6]),
  };
}

export async function listMembers() {
  const api = client();
  const rows = await ensureIds(api, 'members');
  return rows
    .slice(1)
    .filter((r) => r[0] && r[2])
    .map(memRow)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function listEntries() {
  const api = client();
  const rows = await ensureIds(api, 'entries');
  return rows
    .slice(1)
    .filter((r) => r[0] && r[8])
    .map(entryRow)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function matchingRow(rows: (string | number)[][], id: string, col: number) {
  const index = rows.findIndex((r, i) => i > 0 && String(r[col] ?? '').trim() === id);
  if (index < 0) throw new RecordMissingError();
  return { row: index + 1, data: rows[index] };
}

export class RecordMissingError extends Error {
  constructor() {
    super('Registro não encontrado. Atualize a lista e tente novamente.');
  }
}

export class ConflictError extends Error {
  constructor() {
    super('Outro registro com esse nome já existe.');
  }
}

export async function createMember(input: { name: string; category: MemberCategory }) {
  const api = client();
  const data = await ensureIds(api, 'members');
  const normalized = normalize(input.name);
  if (data.some((r, i) => i > 0 && normalize(String(r[0] ?? '')) === normalized)) throw new ConflictError();
  const value: Member = { id: randomUUID(), ...input };
  await api.spreadsheets.values.append({
    spreadsheetId: sheetId!,
    range: range('members', 'A:C'),
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[value.name, value.category, value.id]] },
  });
  return value;
}

function normalize(n: string) {
  return n
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

export async function updateMember(id: string, input: { name: string; category: MemberCategory }) {
  const api = client();
  const data = await ensureIds(api, 'members');
  const { row } = matchingRow(data, id, 2);
  if (data.some((r, i) => i > 0 && i + 1 !== row && normalize(String(r[0] ?? '')) === normalize(input.name))) {
    throw new ConflictError();
  }
  await api.spreadsheets.values.update({
    spreadsheetId: sheetId!,
    range: range('members', `A${row}:C${row}`),
    valueInputOption: 'RAW',
    requestBody: { values: [[input.name, input.category, id]] },
  });
  return { id, ...input };
}

async function deleteAt(type: 'members' | 'entries', id: string, col: number) {
  const api = client();
  const rows = await ensureIds(api, type);
  const { row } = matchingRow(rows, id, col);
  const meta = await api.spreadsheets.get({
    spreadsheetId: sheetId!,
    fields: 'sheets(properties(sheetId,title))',
  });
  const target = meta.data.sheets?.find((s) => s.properties?.title === sheetNames[type]);
  if (target?.properties?.sheetId == null) throw new Error('Aba não encontrada.');
  await api.spreadsheets.batchUpdate({
    spreadsheetId: sheetId!,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: target.properties.sheetId,
              dimension: 'ROWS',
              startIndex: row - 1,
              endIndex: row,
            },
          },
        },
      ],
    },
  });
}

export const deleteMember = (id: string) => deleteAt('members', id, 2);
export const deleteEntry = (id: string) => deleteAt('entries', id, 8);

export async function createEntry(input: Omit<Entry, 'id' | 'postedOn'>) {
  const api = client();
  await ensureIds(api, 'entries');
  const value: Entry = { id: randomUUID(), postedOn: '', ...input };
  await api.spreadsheets.values.append({
    spreadsheetId: sheetId!,
    range: range('entries', 'A:I'),
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[toBr(input.date), input.name, input.reference, input.amount, input.category, input.payment, '', '', value.id]],
    },
  });
  return value;
}

function toBr(date: string) {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export async function updateEntry(id: string, input: Omit<Entry, 'id' | 'postedOn'>) {
  const api = client();
  const data = await ensureIds(api, 'entries');
  const { row } = matchingRow(data, id, 8);
  await api.spreadsheets.values.update({
    spreadsheetId: sheetId!,
    range: range('entries', `A${row}:F${row}`),
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[toBr(input.date), input.name, input.reference, input.amount, input.category, input.payment]],
    },
  });
  return { id, postedOn: isoDateOrEmpty(data[row - 1]?.[6]), ...input };
}

export async function setEntryPosted(id: string, posted: boolean) {
  const api = client();
  const data = await ensureIds(api, 'entries');
  const { row } = matchingRow(data, id, 8);
  const postedOn = posted ? todayInCampoGrande() : '';
  await api.spreadsheets.values.update({
    spreadsheetId: sheetId!,
    range: range('entries', `G${row}:H${row}`),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[postedOn ? toBr(postedOn) : '', posted ? 'Sim' : '']] },
  });
  return { id, postedOn };
}

function todayInCampoGrande() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Campo_Grande',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isoDateOrEmpty(value: unknown) {
  const iso = dateIso(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
}
