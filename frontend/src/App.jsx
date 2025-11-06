/**
 * Main App Component for Kage no Koe
 */

import React from 'react';
import { AppProvider } from './context/AppContext';
import './App.css';

function App() {
  return (
    <AppProvider>
      <div className="app-container">
        <div className="welcome-screen">
          <div className="welcome-content">
            <div className="welcome-icon">👤</div>
            <h1 className="welcome-title">Kage no Koe</h1>
            <p className="welcome-subtitle-jp">影の声 - Voice of the Shadow</p>
            <p className="welcome-subtitle">LocalMind AI Assistant powered by Ollama</p>
            <p className="phase-info">
              🚀 Phase 4 Setup Complete! Ready for component implementation.
            </p>
            <div className="next-steps">
              <h3>Next Steps:</h3>
              <ul>
                <li>Run: <code>npm install</code> in the frontend folder</li>
                <li>Run: <code>npm run dev</code> to start development server</li>
                <li>Follow Phase 4 implementation guide</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
