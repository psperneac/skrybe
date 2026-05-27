import { createRoot } from 'react-dom/client';
import App from './app/App';
import '../style.css';

const container = document.getElementById('app-root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}