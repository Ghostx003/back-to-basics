import React from 'react';
import ReactDOM from 'react-dom/client';
import { InterrogateApp } from './InterrogateApp';
import '../index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <InterrogateApp />
    </React.StrictMode>
  );
}
