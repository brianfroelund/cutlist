import './styles/tokens.css';
import './styles/app.css';
import './styles/print.css';
import { startApp } from './ui/app';
import { initLocale } from './ui/i18n';

await initLocale();
startApp(document.getElementById('app')!);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
