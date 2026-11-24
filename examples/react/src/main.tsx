import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@inno-grid/mygrid-themes/theme.css';
import './styles.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Example root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
