# Tài Liệu Hướng Dẫn Hono-DI Framework

**Hono-DI** là một framework Dependency Injection (DI) nhẹ, lấy cảm hứng từ NestJS, được xây dựng trên nền tảng [Hono](https://hono.dev/) dành cho [Bun](https://bun.sh/). Framework này mang đến kiến trúc modular, hệ thống DI mạnh mẽ và routing dựa trên decorator cho các ứng dụng Hono.

---

## Mục Lục

1.  [Bắt Đầu](#bắt-đầu)
2.  [Modules (Mô-đun)](#modules-mô-đun)
3.  [Controllers & Routing](#controllers--routing)
4.  [Providers & Dependency Injection](#providers--dependency-injection)
5.  [Middleware](#middleware)
6.  [Scopes (Phạm vi)](#scopes-phạm-vi)
7.  [Vòng Đời (Lifecycle Events)](#vòng-đời-lifecycle-events)

---

## Bắt Đầu

### Cài Đặt

```bash
bun add hono hono-di reflect-metadata rxjs
```

### Khởi Động Cơ Bản

Tạo file `src/index.ts`:

```typescript
import 'reflect-metadata'; // Bắt buộc
import { Hono } from 'hono';
import { HonoDiFactory } from 'hono-di';
import { AppModule } from './AppModule';

const app = new Hono();
// Khởi tạo DI container và gắn vào Hono app
await HonoDiFactory.create(AppModule, app);

export default app;
```

---

## Modules (Mô-đun)

Modules giúp tổ chức cấu trúc ứng dụng của bạn. Sử dụng decorator `@Module`.

```typescript
import { Module } from 'hono-di';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],       // Import các module khác
  controllers: [UserController],   // Đăng ký controllers
  providers: [UserService],        // Đăng ký providers/services
  exports: [UserService],          // Export providers để module khác có thể sử dụng
})
export class UserModule {}
```

---

## Controllers & Routing

Controllers xử lý các request HTTP gửi đến.

### Controller Cơ Bản

```typescript
import { Controller, Get, Post, Body, Param, Query } from 'hono-di';

@Controller('users') // Đường dẫn gốc: /users
export class UserController {
  constructor(private userService: UserService) {}

  @Get('/')
  getAll() {
    return this.userService.findAll();
  }

  @Get('/:id')
  getOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post('/')
  create(@Body() userDto: CreateUserDto) {
    return this.userService.create(userDto);
  }
}
```

### Decorator Routing

- **Methods**: `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Options`, `@Head`, `@All`
- **Parameters**:
  - `@Param(key?)`: tham số đường dẫn (path param).
  - `@Query(key?)`: tham số truy vấn (query param).
  - `@Body(key?)`: body của request (đã parse).
  - `@Headers(key?)`: headers của request.
  - `@Req()`: đối tượng `HonoRequest` gốc.
  - `@Res()`: đối tượng `Response` gốc.
  - `@Ctx()`: đối tượng `Context` của Hono.
  - `@Next()`: hàm `Next` của Hono.

### Phản Hồi (Responses)

Bạn có thể trả về:
- Kiểu nguyên thủy (string, number, boolean) -> Trả về dạng text/json.
- Objects/Arrays -> Tự động chuyển thành JSON.
- `Context.json(...)` -> Trả về response chuẩn của Hono.

---

## Providers & Dependency Injection

Providers là các class hoặc giá trị có thể được inject.

### Provider Chuẩn (Class)

```typescript
@Injectable()
export class UserService { ... }
```

### Custom Providers (Provider Tùy Chỉnh)

Trong `@Module({ providers: [...] })`:

1.  **useValue** (Hằng số/Cấu hình):
    ```typescript
    {
      provide: 'CONFIG',
      useValue: { apiUrl: 'https://api.example.com' }
    }
    ```

2.  **useFactory** (Động/Bất đồng bộ):
    Dùng khi provider cần tính toán hoặc load dữ liệu async.
    ```typescript
    {
      provide: 'ASYNC_DATA',
      useFactory: async (config: ConfigService) => {
        return await config.loadData();
      },
      inject: [ConfigService] // Dependencies cần thiết cho factory
    }
    ```

3.  **useExisting** (Alias/Bí danh):
    ```typescript
    {
      provide: 'AliasedService',
      useExisting: RealService
    }
    ```

### Optional Dependencies

Sử dụng `@Optional()` để tránh lỗi nếu dependency không tồn tại.

```typescript
constructor(@Optional() @Inject('UNKNOWN') private dep?: any) {}
```

---

## Middleware

Middleware chặn request trước khi đến route handler.

### Class Middleware

Implement interface `HonoDiMiddleware`:

```typescript
@Injectable()
export class LoggerMiddleware implements HonoDiMiddleware {
  async use(c: Context, next: Next) {
    console.log(`[${c.req.method}] ${c.req.path}`);
    await next();
  }
}
```

### Đăng Ký Middleware

Implement interface `HonoDiModule` trong module của bạn và dùng hàm `configure`:

```typescript
import { Module, HonoDiModule, MiddlewareConsumer } from 'hono-di';

@Module({ ... })
export class AppModule implements HonoDiModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // Áp dụng cho mọi route
      // hoặc .forRoutes({ path: 'users', method: RequestMethod.GET })
  }
}
```

---

## Scopes (Phạm vi)

Kiểm soát vòng đời của providers.

1.  **Singleton** (`Scope.DEFAULT`) - *Mặc định*: Tạo 1 lần duy nhất, chia sẻ toàn app.
2.  **Request** (`Scope.REQUEST`): Tạo mới cho **mỗi request** gửi đến.
3.  **Transient** (`Scope.TRANSIENT`): Tạo mới **mỗi khi được inject** vào đâu đó.

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService { ... }
```

> **Lưu ý**: Nếu inject một Request-scoped provider vào một Singleton provider, Singleton đó sẽ bị "kéo" xuống thành Request-scoped (để đảm bảo tính đúng đắn).

---

## Vòng Đời (Lifecycle Events)

Các hooks cho phép chạy code vào thời điểm khởi tạo:

1.  **OnModuleInit**: Gọi 1 lần khi module/provider được khởi tạo.
2.  **OnApplicationBootstrap**: Gọi 1 lần khi toàn bộ ứng dụng đã start xong.

```typescript
@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    await this.connect(); // Ví dụ kết nối DB
  }
}
```
