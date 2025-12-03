import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('Loading status...');
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/discord/health');
        const json = await res.json();
        if (!json || !json.env) return setStatus('Health check failed');
        const cid = json.env.client_id_set;
        const csecret = json.env.client_secret_set;
        setDisabled(!(cid && csecret));
        if (!cid) setStatus('Error: CLIENT_ID not configured on server.');
        else if (!csecret) setStatus('Error: CLIENT_SECRET not configured on server.');
        else setStatus('OK: Discord Oauth variables detected. Click the login link.');
      } catch (e) {
        setStatus('Error fetching health: ' + e.message);
      }
    }
    fetchHealth();
  }, []);

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', textAlign: 'center', padding: '40px' }}>
      <h1>Discord Token Generator</h1>
      <a id="login-link" href="/api/discord/login" style={{
        background: '#7289DA', color: '#fff', padding: '10px 20px', borderRadius: 3, textDecoration: 'none', display: 'inline-block', pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.5 : 1
      }}>Login through discord</a>
      <p>{status}</p>
    </div>
  );
}
