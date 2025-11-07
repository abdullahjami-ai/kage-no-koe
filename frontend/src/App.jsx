/**
 * Main App Component for Kage no Koe
 * ChatGPT-style interface with React
 */

import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar/Sidebar';
import ChatArea from './components/Chat/ChatArea';
import './theme.css';
import './App.css';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showModels, setShowModels] = useState(false);

  return (
    <AppProvider>
      <div className="app-container">
        <Sidebar
          onSettingsClick={() => setShowSettings(true)}
          onModelsClick={() => setShowModels(true)}
        />
        <ChatArea
          onSettingsClick={() => setShowSettings(true)}
        />

        {/* TODO: Add Settings Modal */}
        {/* TODO: Add Models Modal */}
        {/* TODO: Add Import/Export Modal */}
      </div>
    </AppProvider>
  );
}

export default App;
