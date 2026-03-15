import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// ── Interceptar tokens de recuperación de Supabase ANTES del HashRouter ──
// Supabase redirige con: https://dominio.com/#access_token=XXX&type=recovery
// El HashRouter interpreta eso como una ruta inexistente y redirige a landing.
// Aquí reescribimos el hash para que el router lo entienda.
(function interceptRecoveryTokens() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=') && hash.includes('type=recovery')) {
    // Extraer todo lo que viene después del #
    const params = hash.substring(1); // quitar el #
    // Reescribir como: #/update-password#access_token=...
    window.location.hash = `/update-password#${params}`;
  }
})();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);