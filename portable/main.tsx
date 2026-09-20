import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './ui';
import '../app/globals.css';
import './portable.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
