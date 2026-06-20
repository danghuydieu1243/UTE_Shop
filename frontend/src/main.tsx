import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <div className="mx-auto max-w-container p-10 text-ink">ATHENA — store ready</div>
    </Provider>
  </React.StrictMode>,
);
