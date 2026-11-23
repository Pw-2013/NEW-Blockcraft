import './style.css';
import { Engine } from './game/Engine.js';

window.addEventListener('error', (e) => { console.error(e.error || e.message); });
window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); });

const app = document.getElementById('app');
const engine = new Engine(app);
window.__game = engine; // dev/test hook
engine.start();
