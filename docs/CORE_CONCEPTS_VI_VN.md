# Các Khái Niệm Cốt Lõi (Core Concepts)

Dự án này sử dụng kiến trúc framework tùy chỉnh lấy cảm hứng từ NestJS, được xây dựng trên nền tảng **Hono**. Nó tích hợp sẵn một hệ thống Dependency Injection (DI) tương thích với NestJS.

## 1. Modules

Modules là các khối xây dựng cơ bản của ứng dụng. Chúng nhóm các thành phần liên quan (Controllers, Providers) lại với nhau.

### `@Module(options)`

Sử dụng decorator `@Module` để định nghĩa một module.

```typescript
import { Module } from '../core/decorators';
import { UserController } from './controllers/UserController';
import { UserService } from './services/UserService';

@Module({
  imports: [], // Danh sách các Modules được import
  controllers: [UserController], // Danh sách Controllers
  providers: [UserService], // Danh sách Providers/Services
  exports: [UserService], // Export providers để module khác có thể sử dụng
})
export class UserModule {}
```

## 2. Controllers

Controllers chịu trách nhiệm xử lý các request HTTP gửi đến.

### `@Controller(prefix)`

Định nghĩa một controller với prefix.

```typescript
import { Controller, Get, Post } from '../core/decorators';
import { Context } from 'hono';
import { UserService } from '../services/UserService';

@Controller('users')
export class UserController {
  // Services được tự động inject thông qua constructor
  constructor(private userService: UserService) {}

  @Get('/')
  async getAll(c: Context) {
    return c.json(await this.userService.findAll());
  }
}
```

## 3. Dependency Injection (Built-in)

Framework cung cấp sẵn DI engine hỗ trợ các scope: Singleton, Request, và Transient.

### Định nghĩa Providers `@Injectable()`

```typescript
import { Injectable } from '../core/decorators';
import { Scope } from '../core/injector/scope';

@Injectable({ scope: Scope.DEFAULT }) // Mặc định là Singleton
export class UserService {
  findAll() { ... }
}
```

### Các Scopes
- **`Scope.DEFAULT` (Singleton)**: Một instance duy nhất cho toàn bộ ứng dụng.
- **`Scope.REQUEST`**: Một instance mới được tạo cho mỗi request (được cô lập theo từng request).
- **`Scope.TRANSIENT`**: Một instance mới được tạo mỗi khi được inject.

### Injection
Dependencies được inject qua constructor.

```typescript
constructor(private readonly helper: HelperService) {}
```

## 4. Exception Filters

Exception filters cho phép xử lý lỗi tập trung.

## 5. Bootstrap

Khởi động ứng dụng với `BunDIFactory`.

```typescript
import { Hono } from 'hono';
import { BunDIFactory } from './core/factory';
import { AppModule } from './AppModule';

const app = new Hono();
BunDIFactory.create(AppModule, app);
export default app;
```

---

## 🏗️ Kiến Trúc Hệ Thống (Nâng Cao)

Dành cho các developers muốn hiểu sâu về cách hoạt động của DI Engine:

### 1. The Container (`src/core/injector/container.ts`)
`Container` là sổ đăng ký toàn cục (global registry) chứa tất cả các `Modules`. Nó KHÔNG thực hiện logic khởi tạo instance mà chỉ đóng vai trò lưu trữ đồ thị phụ thuộc (dependency graph).

### 2. NestScanner (`src/core/scanner.ts`)
Scanner chịu trách nhiệm cho "Giai đoạn Xây Dựng Đồ Thị" (Graph Building Phase):
1.  Quét đệ quy root module và các `imports`.
2.  Đọc metadata từ `@Module` (`providers`, `controllers`, `exports`).
3.  Tạo ra các đối tượng `InstanceWrapper` cho mỗi component.
4.  Đưa chúng vào `Container`.

### 3. InstanceWrapper (`src/core/injector/instance-wrapper.ts`)
Mỗi provider hoặc controller được bọc trong một `InstanceWrapper`. Đối tượng này chứa:
-   `token`: Injection token.
-   `metatype`: Class constructor của provider.
-   `scope`: Singleton, Request, hoặc Transient.
-   `instance`: Instance singleton đã được giải quyết.
-   `instancesPerContext`: Map chứa các instances dành riêng cho từng Request (Request-Scoped).

### 4. Injector (`src/core/injector/injector.ts`)
`Injector` chứa logic cho "Giai đoạn Giải Quyết" (Resolution Phase):
-   **`resolve(token, contextId, module)`**:
    -   Tìm `InstanceWrapper` trong module hiện tại.
    -   Nếu không thấy, tìm trong các module `imports` (chỉ khi được export).
    -   Giải quyết các dependencies đệ quy thông qua `resolveConstructorParams`.
    -   Xử lý **Lifecycle Hooks** (Phase 4).
    -   Phát hiện **Lỗi Phụ Thuộc Vòng** (Circular Dependencies).

### 5. ContextId (`src/core/injector/context-id.ts`)
Một `ContextId` duy nhất được tạo ra cho mỗi Request. ID này được truyền xuống toàn bộ cây giải quyết dependencies.
-   **Singleton**: Bỏ qua ID này (dùng chung).
-   **Request-Scoped**: Instance được lưu/lấy từ `wrapper.instancesPerContext.get(id)`.
