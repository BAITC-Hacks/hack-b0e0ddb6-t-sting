import { useState } from 'react';
import { checkHealth } from './api/health';

const connectionStates = {
  idle: [
    'Ready to connect',
    'Check the connection from your browser to the API and database.',
  ],
  checking: [
    'Checking connection',
    'Reaching the API and querying PostgreSQL…',
  ],
  success: [
    'All systems connected',
    'Your browser, NestJS API, and PostgreSQL database are talking.',
  ],
  error: [
    'Connection unavailable',
    'Make sure the API and database are running, then try again.',
  ],
};

export function App() {
  const [state, setState] = useState<keyof typeof connectionStates>('idle');
  const [title, description] = connectionStates[state];

  async function handleCheck() {
    setState('checking');
    try {
      await checkHealth();
      setState('success');
    } catch {
      setState('error');
    }
  }

  return (
    <main>
      <header className="masthead">
        <a className="brand" href="/" aria-label="TΞSTING home">
          <span className="brand-mark" aria-hidden="true">
            t.
          </span>
          TΞSTING workspace
        </a>
        <span className="environment">Local development</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">A foundation for what comes next</p>
        <h1 id="page-title">
          Your next build <br />
          starts here.
        </h1>
        <p className="lede">
          One workspace. A connected stack. Everything you need to start turning
          an idea into a working product.
        </p>
        <div className="stack" aria-label="Technology stack">
          {[
            'React',
            'TypeScript',
            'Vite',
            'NestJS',
            'TypeORM',
            'PostgreSQL',
          ].map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>

      <section className="connection" aria-labelledby="connection-title">
        <div className="section-label">
          <span>01 / CONNECTION</span>
          <code>GET /api/health</code>
        </div>
        <div className={`connection-body ${state}`}>
          <div className="connection-message" role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <h2 id="connection-title">{title}</h2>
              <p>{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCheck}
            disabled={state === 'checking'}
          >
            {state === 'checking' ? 'Checking…' : 'Check connection'}
          </button>
        </div>
      </section>

      <section className="workspace" aria-labelledby="workspace-title">
        <h2 id="workspace-title" className="section-label">
          02 / YOUR WORKSPACE
        </h2>
        <div className="workspace-grid">
          <article>
            <span className="folder">apps/web</span>
            <h3>Make it yours.</h3>
            <p>
              Build your interface with React, TypeScript, and Vite. Changes
              appear as you save.
            </p>
          </article>
          <article>
            <span className="folder">apps/api</span>
            <h3>Give it a backbone.</h3>
            <p>
              Add modules and endpoints in NestJS, with TypeORM ready to connect
              your data.
            </p>
          </article>
        </div>
      </section>
      <footer>
        Built to get you building.<span>React → NestJS → PostgreSQL</span>
      </footer>
    </main>
  );
}
