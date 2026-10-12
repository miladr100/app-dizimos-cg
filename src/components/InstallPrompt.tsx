'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isPhone() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return false;
  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
  return /Windows Phone|IEMobile/i.test(ua);
}

function isInstalled() {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!isPhone() || isInstalled()) return;

    setVisible(true);
    setIos(/iPhone|iPod/i.test(navigator.userAgent));

    const onPrompt = (event: Event) => {
      if (!isPhone() || isInstalled()) return;
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setDeferred(null);
      setVisible(false);
    };
    const media = window.matchMedia('(display-mode: standalone)');
    const onMode = () => {
      if (media.matches) setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', onMode);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onMode);
    };
  }, []);

  if (!visible) return null;

  async function install() {
    if (!deferred) {
      setHint(
        ios
          ? 'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.'
          : 'Abra o menu do navegador e toque em Instalar aplicativo ou Adicionar à tela inicial.',
      );
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === 'accepted') setVisible(false);
  }

  return (
    <section className="install-banner" aria-label="Instalar aplicativo">
      <p>Abra os lançamentos direto da tela inicial, sem passar pelo navegador.</p>
      <button type="button" className="primary" onClick={() => void install()}>
        Instalar este site no seu dispositivo
      </button>
      {hint && <p className="install-hint">{hint}</p>}
    </section>
  );
}
