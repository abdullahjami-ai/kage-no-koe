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
            <div className="status-box">
              <h3>✅ React Setup Complete!</h3>
              <p>Ready to build UI components</p>
            </div>
            <div className="next-steps">
              <h3>🚀 Next Steps:</h3>
              <ul>
                <li>Backend running on <code>http://localhost:5000</code></li>
                <li>Frontend running on <code>http://localhost:5173</code></li>
                <li>Ready for Phase 4.8: Build UI Components</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
