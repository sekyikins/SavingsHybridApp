import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { setupIonicReact } from '@ionic/react';
import App from './App';

// Import global styles
import './index.css';

// Core CSS required for Ionic components
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

// Optional CSS utils
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

// Theme variables
import './theme/variables.css';

// Initialize Ionic
setupIonicReact();

// Initialize the Ionic PWA elements
defineCustomElements(window);

// Create root and render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container!);

  root.render(
    <React.StrictMode>
      <Router>
        <App />
      </Router>
    </React.StrictMode>
  );
}

// PWA support can be added here in the future
