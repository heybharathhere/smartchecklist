import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker: registered from the deployed base path so it also works
// inside a repository subfolder on GitHub Pages.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const scope = new URL('.', window.location.href).pathname;
    navigator.serviceWorker.register(`${scope}sw.js`, { scope }).catch(() => {
      // Offline support is a bonus; the app still works without it.
    });
  });
}
