// import React, { useEffect, useState } from 'react'; import { createRoot } from 'react-dom/client'; import './style.css';
// const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
// function App() { const [path] = useState(location.pathname); if (path.startsWith('/poll/')) return <Poll />; return <Dashboard /> }
// function Auth({ onLogin }) { const [mode, setMode] = useState('login'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''); async function submit(e) { e.preventDefault(); setError(''); try { let r = await fetch(API + '/auth/' + mode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); let d = await r.json(); if (!r.ok) throw Error(d.error); localStorage.token = d.token; onLogin() } catch (x) { setError(x.message) } } return <div className="auth"><div className="card"><h1>LivePoll</h1><p>Create polls and watch votes arrive live.</p><form onSubmit={submit}><input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required /><input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required /><button>{mode === 'login' ? 'Login' : 'Create account'}</button></form>{error && <div className="error">{error}</div>}<button className="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Login'}</button></div></div> }
// function Dashboard() { const [token, setToken] = useState(localStorage.token), [polls, setPolls] = useState([]), [q, setQ] = useState(''), [opts, setOpts] = useState(['', '']); const load = async () => { let r = await fetch(API + '/polls/mine', { headers: { Authorization: 'Bearer ' + localStorage.token } }); if (r.ok) setPolls((await r.json()) || []) }; useEffect(() => { if (token) load() }, [token]); if (!token) return <Auth onLogin={() => setToken(localStorage.token)} />; async function create(e) { e.preventDefault(); let r = await fetch(API + '/polls', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ question: q, options: opts }) }); let d = await r.json(); if (r.ok) { setQ(''); setOpts(['', '']); load() } else alert(d.error) } return <main><header><h1>LivePoll</h1><button onClick={() => { localStorage.clear(); setToken(null) }}>Logout</button></header><section className="card"><h2>Create a poll</h2><form onSubmit={create}><input placeholder="Ask a question..." value={q} onChange={e => setQ(e.target.value)} required />{opts.map((o, i) => <input key={i} placeholder={'Option ' + (i + 1)} value={o} onChange={e => setOpts(opts.map((x, j) => j === i ? e.target.value : x))} required />)}<button type="button" className="secondary" onClick={() => setOpts([...opts, ''])}>+ Add option</button><button>Create Poll</button></form></section><section><h2>Your polls</h2>{polls.map(p => <div className="pollrow" key={p.id}><b>{p.question}</b><span>Share: {location.origin}/poll/{p.shareCode}</span><button onClick={() => navigator.clipboard.writeText(location.origin + '/poll/' + p.shareCode)}>Copy link</button></div>)}</section></main> }
// function Poll() { const code = location.pathname.split('/')[2], [data, setData] = useState(null), [voted, setVoted] = useState(false); const load = () => fetch(API + '/polls/' + code).then(r => r.json()).then(setData); useEffect(() => { load(); let es = new EventSource(API + '/polls/' + code + '/events'); es.onmessage = e => setData(x => x ? { ...x, counts: JSON.parse(e.data) } : x); return () => es.close() }, []); if (!data) return <div className="center">Loading...</div>; let total = data.counts.reduce((a, b) => a + b, 0); async function vote(i) { let id = localStorage.voterId || (localStorage.voterId = crypto.randomUUID()); let r = await fetch(API + '/polls/' + code + '/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optionIndex: i, voterId: id }) }); if (r.ok) { setVoted(true); load() } } return <main className="pollpage"><div className="card"><span className="badge">LIVE</span><h1>{data.poll.question}</h1>{data.poll.options.map((o, i) => { let pct = total ? Math.round(data.counts[i] / total * 100) : 0; return <div className="result" key={o}><div className="resulttop"><span>{o}</span><b>{data.counts[i]} · {pct}%</b></div><div className="bar"><i style={{ width: pct + '%' }} /></div>{!voted && <button className="vote" onClick={() => vote(i)}>Vote</button>}</div> })}<p className="total">{total} total vote{total !== 1 ? 's' : ''}</p>{voted && <div className="success">Thanks! Results will continue updating live.</div>}</div></main> }
// createRoot(document.getElementById('root')).render(<App />);

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = 'http://192.168.31.46:8080/api';

function App() {
    const [path] = useState(location.pathname);

    if (path.startsWith('/poll/')) return <Poll />;

    return <Dashboard />;
}

function Auth({ onLogin }) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    async function submit(e) {
        e.preventDefault();
        setError('');

        try {
            const r = await fetch(API + '/auth/' + mode, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const d = await r.json();

            if (!r.ok) throw Error(d.error);

            localStorage.token = d.token;
            onLogin();
        } catch (x) {
            setError(x.message);
        }
    }

    return (
        <div className="auth">
            <div className="card">
                <h1>LivePoll</h1>
                <p>Create polls and watch votes arrive live.</p>

                <form onSubmit={submit}>
                    <input
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />

                    <input
                        placeholder="Password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />

                    <button>
                        {mode === 'login' ? 'Login' : 'Create account'}
                    </button>
                </form>

                {error && <div className="error">{error}</div>}

                <button
                    className="link"
                    onClick={() =>
                        setMode(mode === 'login' ? 'signup' : 'login')
                    }
                >
                    {mode === 'login'
                        ? 'Need an account? Sign up'
                        : 'Already have an account? Login'}
                </button>
            </div>
        </div>
    );
}

function Dashboard() {
    const [token, setToken] = useState(localStorage.token);
    const [polls, setPolls] = useState([]);
    const [q, setQ] = useState('');
    const [opts, setOpts] = useState(['', '']);
    const [copied, setCopied] = useState('');

    const load = async () => {
        const r = await fetch(API + '/polls/mine', {
            headers: {
                Authorization: 'Bearer ' + localStorage.token
            }
        });

        if (r.ok) {
            setPolls((await r.json()) || []);
        }
    };

    useEffect(() => {
        if (token) load();
    }, [token]);

    if (!token) {
        return <Auth onLogin={() => setToken(localStorage.token)} />;
    }

    async function create(e) {
        e.preventDefault();

        const r = await fetch(API + '/polls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({
                question: q,
                options: opts
            })
        });

        const d = await r.json();

        if (r.ok) {
            setQ('');
            setOpts(['', '']);
            load();
        } else {
            alert(d.error);
        }
    }

    return (
        <main>
            <header className="topbar">
                <div>
                    <div className="brand">
                        <span className="brand-dot"></span>
                        <h1>LivePoll</h1>
                    </div>

                    <p className="dashboard-title">
                        Create polls and watch responses in real time.
                    </p>
                </div>

                <button
                    className="logout-btn"
                    onClick={() => {
                        localStorage.clear();
                        setToken(null);
                    }}
                >
                    Logout
                </button>
            </header>

            <section className="card create-card">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">CREATE</span>
                        <h2>Create a poll</h2>
                        <p>Ask a question and let people vote.</p>
                    </div>
                </div>

                <form onSubmit={create}>
                    <input
                        placeholder="Ask a question..."
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        required
                    />

                    {opts.map((o, i) => (
                        <input
                            key={i}
                            placeholder={'Option ' + (i + 1)}
                            value={o}
                            onChange={e =>
                                setOpts(
                                    opts.map((x, j) =>
                                        j === i ? e.target.value : x
                                    )
                                )
                            }
                            required
                        />
                    ))}

                    {opts.length < 6 && (
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => setOpts([...opts, ''])}
                        >
                            + Add option
                        </button>
                    )}

                    <button>Create Poll</button>
                </form>
            </section>

            <section>
                <h2>Your polls</h2>

                {polls.map(p => (
                    <div className="pollrow" key={p.id}>
                        <b>{p.question}</b>

                        <div className="share-box">
                            <span>
                                {location.origin}/poll/{p.shareCode}
                            </span>

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(
                                        location.origin + '/poll/' + p.shareCode
                                    );
                                    setCopied(p.shareCode);
                                    setTimeout(() => setCopied(''), 1500);
                                }}
                            >
                                {copied === p.shareCode ? 'Copied!' : 'Copy link'}
                            </button>
                        </div>
                    </div>
                ))}
            </section>
        </main>
    );
}

function Poll() {
    const code = location.pathname.split('/')[2];

    const [data, setData] = useState(null);
    const [voted, setVoted] = useState(false);

    const load = () =>
        fetch(API + '/polls/' + code)
            .then(r => r.json())
            .then(setData);

    useEffect(() => {
        load();

        const es = new EventSource(
            API + '/polls/' + code + '/events'
        );

        es.onmessage = e => {
            setData(x =>
                x
                    ? {
                        ...x,
                        counts: JSON.parse(e.data)
                    }
                    : x
            );
        };

        return () => es.close();
    }, []);

    if (!data) {
        return <div className="center">Loading...</div>;
    }

    const total = data.counts.reduce(
        (a, b) => a + b,
        0
    );

    async function vote(i) {
        const id =
            localStorage.voterId ||
            (localStorage.voterId = 'voter-' + Date.now());

        const r = await fetch(
            API + '/polls/' + code + '/vote',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    optionIndex: i,
                    voterId: id
                })
            }
        );

        if (r.ok) {
            setVoted(true);
            load();
        }
    }

    return (
        <main className="pollpage">
            <div className="card">
                <span className="badge">● LIVE RESULTS</span>

                <p className="poll-label">LIVE POLL</p>

                <h1>{data.poll.question}</h1>

                {data.poll.options.map((o, i) => {
                    const pct = total
                        ? Math.round(
                            (data.counts[i] / total) * 100
                        )
                        : 0;

                    return (
                        <div className="result" key={o}>
                            <div className="resulttop">
                                <span>{o}</span>
                                <b>
                                    {data.counts[i]} · {pct}%
                                </b>
                            </div>

                            <div className="bar">
                                <i style={{ width: pct + '%' }} />
                            </div>

                            {!voted && (
                                <button
                                    className="vote"
                                    onClick={() => vote(i)}
                                >
                                    Vote
                                </button>
                            )}
                        </div>
                    );
                })}

                <p className="total">
                    {total} {total === 1 ? 'vote' : 'votes'} received
                </p>

                {voted && (
                    <div className="success">
                        Thanks! Results will continue updating live.
                    </div>
                )}
            </div>
        </main>
    );
}

createRoot(document.getElementById('root')).render(
    <App />
);
