# Bun Backend với Hono và DI Structure

Backend API được xây dựng với Bun runtime, sử dụng Hono framework và kiến trúc Modular lấy cảm hứng từ NestJS với Dependency Injection.

## 🏗️ Kiến trúc

```
src/
├── common/             # Shared utilities, Exceptions, Filters
│   ├── exceptions/     # HTTP Exceptions
│   └── filters/        # Exception Filters
├── core/               # Core Framework (Decorators, Factory, DI)
├── config/             # Configuration
├── modules/            # Feature Modules
│   ├── UserModule.ts
│   └── ProductModule.ts
├── controllers/        # Controllers
│   ├── UserController.ts
│   └── ProductController.ts
├── services/           # Business logic
├── models/             # Data models & DTOs
├── repositories/       # Data access layer
└── index.ts            # Application entry point
```

## 📚 Tài liệu (Documentation)

- [Full Documentation (English)](./docs/README.md)
- [Tài Liệu Hướng Dẫn Đầy Đủ (Tiếng Việt)](./docs/README.vi.md)

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

## 📚 API Endpoints

Server chạy tại `http://localhost:3000`.

### Routes
- `GET /health` - Health check
- `/users` - User management
- `/products` - Product management
- `/example` - Example controller with Error Handling

## 🔧 Features

- **Dependency Injection**: Custom, lightweight IoC container inspired by NestJS.
- **Modular Architecture**: organize code into Modules, Controllers, and Services.
- **Global Prefix Support**: easily prefix all routes (e.g., `/api/v1`).
- **Custom Logger**: NestJS-style logger with timestamps and coloration.
- **Decorators**: `@Controller`, `@Get`, `@Post`, `@Injectable`, `@Module`, etc.

## 🛠️ Global Prefix Configuration

To set a global prefix (e.g., `/api`), use `{ autoInit: false }` when creating the app:

```typescript
// src/index.ts
import { Hono } from 'hono';
import { HonoDiFactory } from 'hono-di'; // or local path

const honoApp = new Hono();
// 1. Create app with autoInit: false
const app = await HonoDiFactory.create(AppModule, { app: honoApp, autoInit: false });

// 2. Set Prefix
app.setGlobalPrefix('/api/v1');

// 3. Initialize & Listen
await app.init();
await app.listen(3000);
```

## 🔧 Dependency Injection

Dự án sử dụng **Custom IoC Container** (built-in) kết hợp với decorators (`@Module`, `@Controller`) để quản lý dependencies. Không cần thư viện bên thứ 3 như tsyringe.

## 📦 Dependencies

- **bun** - JavaScript runtime
- **hono** - Web framework
- **zod** - Schema validation
- **rxjs** - Reactive Extensions (used for Interceptors)
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
