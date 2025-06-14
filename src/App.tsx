import React from 'react';
import { LiveScores } from './components/LiveScores';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Live Sports Scores</h1>
      </header>
      <main>
        <LiveScores />
      </main>
    </div>
  );
}

export default App;
