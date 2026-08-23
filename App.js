import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import AppToast from './src/components/AppToast';

function WebTheme() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'smart-learning-lab-theme-v3';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      :root {
        --sll-primary: #5B3DF5;
        --sll-primary-dark: #4528D9;
        --sll-navy: #11143D;
        --sll-text: #1B2145;
        --sll-muted: #72789B;
        --sll-bg: #F8F9FD;
        --sll-border: #E9EAF3;
        --sll-font: Poppins, Inter, Arial, sans-serif;
      }
      html, body, #root {
        margin: 0;
        min-height: 100%;
        background: var(--sll-bg);
        color: var(--sll-text);
        font-family: var(--sll-font);
      }
      *, *::before, *::after { box-sizing: border-box; }
      button, input, textarea, select { font-family: var(--sll-font); }
      ::selection { background: #DDD6FE; color: var(--sll-navy); }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #F8F9FD; }
      ::-webkit-scrollbar-thumb { background: #D8D4F8; border-radius: 99px; }
      ::-webkit-scrollbar-thumb:hover { background: #B9B1FF; }
    `;
    document.head.appendChild(style);
  }, []);

  return null;
}

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <WebTheme />
      <AppNavigator />
      <AppToast />
    </>
  );
}
