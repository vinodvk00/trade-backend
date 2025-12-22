# Order Execution Engine

Concurrent order execution system with DEX routing, queue-based processing, and WebSocket status updates.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database/redis credentials

# Start server
npm run dev
```

## Architecture

```
HTTP Request → API Layer → Service Layer → Queue (BullMQ)
                               ↓
                         Database (PostgreSQL)
                               ↓
                         Worker Process → DEX Router → Mock DEX APIs
                               ↓
                         WebSocket Updates
```

### Components

**BullMQ**: Job queue for order execution. Provides job persistence, automatic retries, and rate limiting. Orders are queued to handle concurrent requests without blocking the API.

**PostgreSQL**: Relational storage with row-level locking for atomic status updates. Prevents race conditions when multiple requests attempt to execute the same order.

**WebSocket**: Real-time order status updates. Reduces polling overhead and provides immediate feedback during order execution.

**Mock DEX**: Simulates Raydium and Meteora DEX behavior with configurable delays and failure rates for testing.

## API Reference

### Create Order
```bash
POST /api/orders
Content-Type: application/json

{
  "userWallet": "wallet-address",
  "inputToken": "SOL",
  "outputToken": "USDC",
  "inputAmount": 10
}
```

### Execute Order (Queued)
```bash
POST /api/orders/execute
Content-Type: application/json

{
  "userWallet": "wallet-address",
  "inputToken": "SOL",
  "outputToken": "USDC",
  "inputAmount": 10
}
```

### Get Order Status
```bash
GET /api/orders/:orderId
```

### Get User Orders
```bash
GET /api/orders/user/:wallet?limit=50
```

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/orders/:orderId');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // { type: 'status', orderId, status, timestamp, data }
};
```

### Health Check
```bash
GET /health
```

## Order Lifecycle

1. **PENDING**: Order created, waiting for execution
2. **ROUTING**: Fetching quotes from DEXs (Raydium, Meteora)
3. **BUILDING**: Constructing swap transaction
4. **SUBMITTED**: Transaction sent to DEX
5. **CONFIRMED**: Swap executed successfully
6. **FAILED**: Execution failed (routing error, insufficient liquidity, etc.)

## Testing

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# Integration tests
npm run test:order        # Single order flow
npm run test:concurrent   # Concurrent orders
npm run test:ws           # WebSocket updates
```

**Coverage**: 63 tests, 93%+ coverage on core services (order.service, dex-router, repository).

## Technical Notes

### Race Condition Prevention

Uses PostgreSQL `SELECT FOR UPDATE` with transactions for atomic status checks and updates:

```typescript
// Atomically transition PENDING → ROUTING
const order = await repository.updateStatusIfMatches(
  orderId,
  OrderStatus.PENDING,
  OrderStatus.ROUTING
);
```

Only one concurrent request succeeds; others receive status mismatch errors.

### Concurrency

- Connection pool: 10 max PostgreSQL connections
- Queue concurrency: Configurable worker concurrency (default: 5)
- Row-level locks: Only the specific order is locked during status transitions

### Graceful Shutdown

Handles SIGTERM/SIGINT signals to:
1. Stop accepting new HTTP requests
2. Close BullMQ worker (finish in-progress jobs)
3. Release database connections
4. Disconnect Redis

### Mock DEX Behavior

Configurable via environment variables:
- `MOCK_DEX_QUOTE_DELAY_MS`: Quote fetch latency (default: 200ms)
- `MOCK_DEX_EXECUTION_DELAY_MS`: Swap execution time (default: 2500ms)
- `MOCK_DEX_FAILURE_RATE`: Probability of execution failure (default: 0.05)

Production would integrate with actual Solana DEX SDKs (Raydium SDK, Meteora SDK).

## Configuration

All configuration in `.env`:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=order_execution
DB_USER=postgres
DB_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379
```

Missing required variables will:
- **Production** (`NODE_ENV=production`): Fail startup with error
- **Development**: Log warnings, use defaults


## Development

```bash
# Development mode (auto-reload)
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint
```

## License

MIT
