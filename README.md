# Order Execution Engine

Order execution system with DEX routing and real-time updates.

## Setup

```bash
npm install
npm run dev
```

## Architecture

Layered architecture with separation of concerns:
- API layer for HTTP/WebSocket handling
- Service layer for business logic
- Data layer for persistence
- Queue layer for async processing
