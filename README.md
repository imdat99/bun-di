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

- [Core Concepts (English)](./docs/CORE_CONCEPTS.md)
- [Các Khái Niệm Cốt Lõi (Tiếng Việt)](./docs/CORE_CONCEPTS_VI_VN.md)

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

## 🔧 Dependency Injection

Dự án sử dụng **tsyringe** kết hợp với custom decorators (`@Module`, `@Controller`) để quản lý dependencies.

## 📦 Dependencies

- **bun** - JavaScript runtime
- **hono** - Web framework
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
