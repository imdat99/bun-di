# Bun Backend với Hono, tRPC và DI

Backend API được xây dựng với Bun runtime, sử dụng Hono framework, tRPC cho type-safe API và Dependency Injection với tsyringe.

## 🏗️ Kiến trúc

```
src/
├── common/              # Shared utilities
│   ├── errors/         # Custom error classes
│   └── interfaces/     # Common interfaces
├── config/             # Configuration
│   └── env.ts         # Environment variables
├── container/          # DI container setup
│   └── container.ts   # Service registration
├── trpc/              # tRPC setup
│   ├── context.ts     # Context with DI container
│   ├── trpc.ts        # tRPC instance
│   └── routers/       # tRPC routers
│       ├── appRouter.ts
│       ├── userRouter.ts
│       └── productRouter.ts
├── models/            # Data models & DTOs
│   ├── User.ts
│   └── Product.ts
├── repositories/      # Data access layer
│   ├── IRepository.ts
│   ├── UserRepository.ts
│   └── ProductRepository.ts
├── services/         # Business logic
│   ├── LoggerService.ts
│   ├── UserService.ts
│   └── ProductService.ts
└── index.ts         # Application entry point (Hono App)
```

## 🚀 Cài đặt

```bash
# Install dependencies
bun install

# Copy environment file
cp .env.example .env
```

## 🏃 Chạy ứng dụng

```bash
# Development mode (with hot reload)
bun run dev

# Build for production
bun run build

# Run production build
bun dist/index.js
```

## 🧪 Testing

```bash
# Run client example
bun src/examples/client.example.ts
```

## 📚 API Endpoints

Server chạy tại `http://localhost:3000/trpc`.

### Hono Routes
- `GET /health` - Health check

### tRPC Procedures
- `user.*` - User management
- `product.*` - Product management

## 🔧 Dependency Injection

Dự án sử dụng **tsyringe** để quản lý dependencies. Các services được đăng ký trong `src/container/container.ts`.

## 📦 Dependencies

- **bun** - JavaScript runtime
- **hono** - Web framework
- **@trpc/server** - tRPC server
- **zod** - Schema validation
- **tsyringe** - Dependency injection container
- **reflect-metadata** - Required for decorators

## 🔒 Environment Variables

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
LOG_LEVEL=info
```

## 📄 License

MIT
