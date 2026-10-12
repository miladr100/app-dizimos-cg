'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, RefreshCw, Users, Receipt } from 'lucide-react';
import { Member, Entry, categories, entryCategories, payments } from '@/lib/types';
import { blankMember, money } from '@/lib/constants';
import { api, blankEntry, fmtDate, message, type EntryForm } from '@/lib/helpers';

type Section = 'entries' | 'members';
type Notice = { message: string; error: boolean } | null;

export default function Home() {
  const [section, setSection] = useState<Section>('entries');
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [member, setMember] = useState(blankMember);
  const [entry, setEntry] = useState<EntryForm>(blankEntry);
  const [memberEdit, setMemberEdit] = useState<string | null>(null);
  const [entryEdit, setEntryEdit] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<{ type: Section; id: string; name: string } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, e] = await Promise.all([api<Member[]>('members'), api<Entry[]>('entries')]);
      setMembers(m);
      setEntries(e);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setNotice({ error: true, message: message(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setNotice(null);
    setQuery('');
  }, [section]);

  const filteredMembers = useMemo(
    () =>
      members.filter((x) =>
        `${x.name} ${x.category}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
      ),
    [members, query],
  );

  const filteredEntries = useMemo(
    () =>
      entries.filter((x) =>
        `${x.name} ${x.reference} ${x.category} ${x.payment} ${fmtDate(x.date)}`
          .toLocaleLowerCase('pt-BR')
          .includes(query.toLocaleLowerCase('pt-BR')),
      ),
    [entries, query],
  );

  async function saveMember(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const name = member.name.trim();
      if (name.length < 2) throw new Error('Informe um nome válido.');
      await api(
        'members',
        memberEdit ? 'PATCH' : 'POST',
        memberEdit ? { id: memberEdit, ...member, name } : { ...member, name },
      );
      setMember(blankMember);
      setMemberEdit(null);
      await refresh();
      setNotice({ error: false, message: memberEdit ? 'Membro atualizado.' : 'Membro cadastrado.' });
    } catch (err) {
      setNotice({ error: true, message: message(err) });
    } finally {
      setSaving(false);
    }
  }

  async function saveEntry(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      if (!entry.name) throw new Error('Selecione o nome de um membro.');
      if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
        throw new Error('Informe um valor maior que zero.');
      }
      await api('entries', entryEdit ? 'PATCH' : 'POST', entryEdit ? { id: entryEdit, ...entry } : entry);
      setEntry(blankEntry());
      setEntryEdit(null);
      await refresh();
      setNotice({
        error: false,
        message: entryEdit ? 'Lançamento atualizado.' : 'Lançamento salvo na planilha.',
      });
    } catch (err) {
      setNotice({ error: true, message: message(err) });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm) return;
    setSaving(true);
    setNotice(null);
    try {
      await api(confirm.type, 'DELETE', { id: confirm.id });
      if (confirm.type === 'members' && memberEdit === confirm.id) {
        setMember(blankMember);
        setMemberEdit(null);
      }
      if (confirm.type === 'entries' && entryEdit === confirm.id) {
        setEntry(blankEntry());
        setEntryEdit(null);
      }
      setConfirm(null);
      await refresh();
      setNotice({ error: false, message: 'Registro excluído da planilha.' });
    } catch (err) {
      setConfirm(null);
      setNotice({ error: true, message: message(err) });
    } finally {
      setSaving(false);
    }
  }

  function editMember(m: Member) {
    setSection('members');
    setMember({ name: m.name, category: m.category });
    setMemberEdit(m.id);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editEntry(e: Entry) {
    setSection('entries');
    setEntry({
      date: e.date,
      name: e.name,
      reference: e.reference,
      amount: e.amount,
      category: e.category,
      payment: e.payment,
    });
    setEntryEdit(e.id);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const switchTo = (s: Section) => {
    setSection(s);
    setMember(blankMember);
    setEntry(blankEntry());
    setEntryEdit(null);
    setMemberEdit(null);
  };

  return (
    <main className="shell">
      <header className="topbar">
        <nav className="tabs" aria-label="Navegação">
          <button
            type="button"
            className={'tab ' + (section === 'entries' ? 'active' : '')}
            onClick={() => switchTo('entries')}
          >
            Lançamento
          </button>
          <button
            type="button"
            className={'tab ' + (section === 'members' ? 'active' : '')}
            onClick={() => switchTo('members')}
          >
            Membros
          </button>
        </nav>
        <span className="status">
          <span className="dot" />
          {lastUpdate ? `Atualizado às ${lastUpdate}` : 'Conectando...'}
        </span>
      </header>

      {notice && (
        <div role="alert" className={'notice ' + (notice.error ? 'err' : '')}>
          {notice.message}
        </div>
      )}

      <div className="columns">
        <section>
          <div className="eyebrow">{section === 'entries' ? 'NOVO REGISTRO' : 'CADASTRO'}</div>
          <h1 className="heading">{section === 'entries' ? 'Novo lançamento' : 'Membros'}</h1>
          <p className="subtitle">
            {section === 'entries'
              ? 'Preencha os dados e salve diretamente na aba Dizimos.'
              : 'Cadastre um nome para disponibilizá-lo no próximo lançamento.'}
          </p>

          {section === 'members' ? (
            <form className="panel" onSubmit={saveMember}>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="mname">Nome</label>
                  <input
                    id="mname"
                    required
                    maxLength={150}
                    placeholder="Nome do irmão, irmã, casal ou família"
                    value={member.name}
                    onChange={(e) => setMember((v) => ({ ...v, name: e.target.value }))}
                  />
                </div>
                <div className="field full">
                  <label htmlFor="mcategory">Categoria</label>
                  <select
                    id="mcategory"
                    value={member.category}
                    onChange={(e) =>
                      setMember((v) => ({ ...v, category: e.target.value as Member['category'] }))
                    }
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="actions">
                <button className="primary" disabled={saving}>
                  {saving ? 'Salvando...' : memberEdit ? 'Salvar alterações' : 'Adicionar membro'}
                </button>
                {memberEdit && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setMember(blankMember);
                      setMemberEdit(null);
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form className="panel" onSubmit={saveEntry}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="date">Data</label>
                  <input
                    id="date"
                    type="date"
                    required
                    value={entry.date}
                    onChange={(e) => setEntry((v) => ({ ...v, date: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="amount">Valor (R$)</label>
                  <input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={entry.amount || ''}
                    onChange={(e) => setEntry((v) => ({ ...v, amount: Number(e.target.value) }))}
                  />
                </div>
                <div className="field full">
                  <label htmlFor="ename">Nome</label>
                  <select
                    id="ename"
                    required
                    value={entry.name}
                    onChange={(e) => setEntry((v) => ({ ...v, name: e.target.value }))}
                  >
                    <option value="">
                      {members.length
                        ? 'Selecione um membro'
                        : 'Nenhum membro cadastrado — adicionar agora'}
                    </option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                    {entry.name && !members.some((m) => m.name === entry.name) && (
                      <option value={entry.name}>{entry.name} (registro antigo)</option>
                    )}
                  </select>
                  {!members.length && (
                    <button className="secondary" type="button" onClick={() => switchTo('members')}>
                      Cadastrar primeiro membro
                    </button>
                  )}
                </div>
                <div className="field full">
                  <label htmlFor="reference">Referência</label>
                  <input
                    id="reference"
                    maxLength={250}
                    placeholder="Ex.: Dízimo 2026"
                    value={entry.reference}
                    onChange={(e) => setEntry((v) => ({ ...v, reference: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="category">Categoria</label>
                  <select
                    id="category"
                    value={entry.category}
                    onChange={(e) => setEntry((v) => ({ ...v, category: e.target.value }))}
                  >
                    {[...new Set([...entryCategories, ...entries.map((x) => x.category)])]
                      .filter(Boolean)
                      .map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="payment">Forma de pagamento</label>
                  <select
                    id="payment"
                    value={entry.payment}
                    onChange={(e) => setEntry((v) => ({ ...v, payment: e.target.value }))}
                  >
                    {[...new Set([...payments, ...entries.map((x) => x.payment)])]
                      .filter(Boolean)
                      .map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="actions">
                <button className="primary" disabled={saving || (!members.length && !entryEdit)}>
                  {saving ? 'Salvando...' : entryEdit ? 'Salvar alterações' : 'Salvar lançamento'}
                </button>
                {entryEdit && (
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      setEntry(blankEntry());
                      setEntryEdit(null);
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        <section>
          <div className="section-top">
            <div>
              <div className="eyebrow">{section === 'entries' ? 'PLANILHA' : 'ABA MEMBROS'}</div>
              <h2 className="section-title">
                {section === 'entries' ? 'Lançamentos recentes' : 'Cadastrados'}
              </h2>
            </div>
            <span className="counter">{section === 'entries' ? entries.length : members.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="search"
              aria-label="Pesquisar registros"
              placeholder={section === 'entries' ? 'Buscar lançamentos...' : 'Buscar membros...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="mini"
              style={{ marginTop: 17, height: 44 }}
              aria-label="Atualizar listas"
              title="Atualizar"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          {loading ? (
            <div className="loader">Atualizando planilha...</div>
          ) : (section === 'members' ? filteredMembers.length === 0 : filteredEntries.length === 0) ? (
            <div className="blank">
              <div className="round-icon">
                {section === 'entries' ? <Receipt size={23} /> : <Users size={23} />}
              </div>
              <h3>
                {query
                  ? 'Nenhum resultado encontrado'
                  : section === 'entries'
                    ? 'Nenhum lançamento ainda'
                    : 'A lista está vazia'}
              </h3>
              <p>
                {query
                  ? 'Tente outro termo.'
                  : section === 'entries'
                    ? 'Os registros salvos aparecerão aqui, do mais recente para o mais antigo.'
                    : 'O primeiro nome cadastrado aparecerá aqui.'}
              </p>
            </div>
          ) : (
            <div className="list">
              {section === 'members'
                ? filteredMembers.map((m) => (
                    <article className="item" key={m.id}>
                      <div className="item-head">
                        <h3>{m.name}</h3>
                        <span className="pill">{m.category}</span>
                      </div>
                      <div className="item-actions">
                        <button className="mini" onClick={() => editMember(m)}>
                          <Pencil size={14} /> Editar
                        </button>
                        <button
                          className="mini delete"
                          onClick={() => setConfirm({ type: 'members', id: m.id, name: m.name })}
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    </article>
                  ))
                : filteredEntries.map((e) => (
                    <article className="item" key={e.id}>
                      <div className="item-head">
                        <h3>{e.name}</h3>
                        <span className="amount">{money.format(e.amount)}</span>
                      </div>
                      <div className="item-meta">
                        <span className="pill">{e.category}</span>
                        <span>{e.payment}</span>
                        <span>·</span>
                        <span>{fmtDate(e.date)}</span>
                        {e.reference && <span>· {e.reference}</span>}
                      </div>
                      <div className="item-actions">
                        <button className="mini" onClick={() => editEntry(e)}>
                          <Pencil size={14} /> Editar
                        </button>
                        <button
                          className="mini delete"
                          onClick={() => setConfirm({ type: 'entries', id: e.id, name: e.name })}
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    </article>
                  ))}
            </div>
          )}
        </section>
      </div>

      {confirm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setConfirm(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h3 id="delete-title">Confirmar exclusão</h3>
            <p>
              Deseja excluir {confirm.type === 'entries' ? 'o lançamento de' : 'o cadastro de'}{' '}
              <strong>{confirm.name}</strong>? Essa ação será aplicada diretamente no Google Sheets e
              não poderá ser desfeita pelo aplicativo. Os lançamentos antigos não serão alterados ao
              excluir um membro.
            </p>
            <div className="actions">
              <button className="secondary" type="button" disabled={saving} onClick={() => setConfirm(null)}>
                Cancelar
              </button>
              <button
                className="primary"
                style={{ background: '#cd8479' }}
                type="button"
                disabled={saving}
                onClick={() => void remove()}
              >
                {saving ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
