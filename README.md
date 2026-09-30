# LivePoll

A live polling tool that allows users to create polls, share them, and view results in real time.

## Stack
- Frontend: React + Vite
- Backend: Go + Gin
- Database: MongoDB
- Realtime: Redis Pub/Sub + Redis hash counters + Server-Sent Events (SSE)
## Live Demo

- Frontend: https://livepoll-frontend-utrs.onrender.com
- Backend: https://livepoll-mn4b.onrender.com

## Live Demo

- Frontend: https://livepoll-frontend-utrs.onrender.com
- Backend: https://livepoll-mn4b.onrender.com

## Features
- Signup/login with JWT authentication
- Authenticated poll creation
- Shareable poll links
- Public voting
- Redis-backed live vote counts
- Live results without page refresh
- Backend validation

## Local setup
### Backend
1. Copy `.env.example` to `.env` and set values.
2. Start MongoDB and Redis.
3. Run:
```bash
go mod tidy
go run .
```

### Frontend
```bash
npm install
npm run dev
```
Set `VITE_API_URL` if the backend is not at `http://localhost:8080/api`.

## Important interview explanation
When a vote arrives, Go validates it and stores it in MongoDB. Redis increments the option count and publishes an event on the poll channel. The results page keeps an SSE connection open; when an event arrives, React updates the counts without a browser refresh.

## Submission checklist
- Public GitHub repository
- Public deployed frontend and backend
- Test the full create/share/vote/live-results flow in two browser windows
- Record the required 3–5 minute video covering the biggest challenge and AI-tool usage
