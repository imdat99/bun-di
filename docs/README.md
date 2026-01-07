# Hono-DI Framework Documentation

**Hono-DI** is a lightweight, NestJS-inspired Dependency Injection (DI) framework built on top of [Hono](https://hono.dev/) for the [Bun](https://bun.sh/) runtime. It brings modular architecture, powerful DI, and decorator-based routing to Hono applications.

---

## Table of Contents

1.  [Getting Started](#getting-started)
2.  [Modules](#modules)
3.  [Controllers & Routing](#controllers--routing)
4.  [Providers & Dependency Injection](#providers--dependency-injection)
5.  [Middleware](#middleware)
6.  [Scopes](#scopes)
7.  [Lifecycle Events](#lifecycle-events)
8.  [Exception Filters](#exception-filters)
9.  [Testing](#testing)

---

## Getting Started

### Installation

```bash
bun add hono hono-di reflect-metadata rxjs
```

### Basic Bootstrap

Create your entry file `src/index.ts`:

```typescript
import 'reflect-metadata';
import { Hono } from 'hono';
import { HonoDiFactory } from 'hono-di';
import { AppModule } from './AppModule';

const app = new Hono();
// Bootstrap the DI container and attach to Hono app
await HonoDiFactory.create(AppModule, app);

export default app;
```

---

## Modules

Modules organize your application structure. Use the `@Module` decorator.

```typescript
import { Module } from 'hono-di';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],       // Import other modules
  controllers: [UserController],   // Register controllers
  providers: [UserService],        // Register providers
  exports: [UserService],          // Export providers for other modules to use
})
export class UserModule {}
```

---

## Controllers & Routing

Controllers handle incoming HTTP requests.

### Basic Controller

```typescript
import { Controller, Get, Post, Body, Param, Query } from 'hono-di';

@Controller('users') // Base path: /users
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

### Route Decorators

- **Methods**: `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Options`, `@Head`, `@All`
- **Parameters**:
  - `@Param(key?)`: specific path parameter or all params.
  - `@Query(key?)`: specific query parameter or all queries.
  - `@Body(key?)`: request body (parsed) or specific field.
  - `@Headers(key?)`: request headers.
  - `@Req()`: raw Hono `HonoRequest`.
  - `@Res()`: raw `Response` object (use carefully).
  - `@Ctx()`: Hono `Context` object.
  - `@Next()`: Hono `Next` function.

### Responses

You can return:
- Primitives (string, number, boolean) -> Sent as text/json.
- Objects/Arrays -> Sent as JSON.
- `Context.json(...)` -> Standard Hono response.

---

## Providers & Dependency Injection

Providers are classes or values that can be injected.

### Standard Provider (Class)

```typescript
@Injectable()
export class UserService { ... }
```

### Custom Providers

Inside `@Module({ providers: [...] })`:

1.  **useValue** (Constants/Configuration):
    ```typescript
    {
      provide: 'CONFIG',
      useValue: { apiUrl: 'https://api.example.com' }
    }
    ```

2.  **useFactory** (Dynamic/Async):
    ```typescript
    {
      provide: 'ASYNC_DATA',
      useFactory: async (config: ConfigService) => {
        return await config.loadData();
      },
      inject: [ConfigService] // Dependencies for the factory
    }
    ```

3.  **useExisting** (Alias):
    ```typescript
    {
      provide: 'AliasedService',
      useExisting: RealService
    }
    ```

### Optional Dependencies

Use `@Optional()` to avoid errors if a dependency is missing.

```typescript
constructor(@Optional() @Inject('UNKNOWN') private dep?: any) {}
```

---

## Middleware

Middleware intercepts requests before they reach the route handler.

### Functional Middleware

Any standard Hono, standard `hono-di` middleware can be used.

### Class Middleware

Implement `HonoDiMiddleware` interface.

```typescript
@Injectable()
export class LoggerMiddleware implements HonoDiMiddleware {
  async use(c: Context, next: Next) {
    console.log(`[${c.req.method}] ${c.req.path}`);
    await next();
  }
}
```

### Registering Middleware

Implement `HonoDiModule` interface in your module.

```typescript
import { Module, HonoDiModule, MiddlewareConsumer } from 'hono-di';

@Module({ ... })
export class AppModule implements HonoDiModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // Apply to all routes
      // or .forRoutes({ path: 'users', method: RequestMethod.GET })
  }
}
```

---

## Scopes

Control the lifecycle of your providers.

1.  **Singleton** (`Scope.DEFAULT`) - *Default*: Created once, shared across the app.
2.  **Request** (`Scope.REQUEST`): Created new for **every incoming request**.
3.  **Transient** (`Scope.TRANSIENT`): Created new **every time it is injected**.

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService { ... }
```

> **Note**: Injecting a Request-scoped provider into a Singleton provider will effectively make the Singleton provider Request-scoped (bubble up).

---

## Lifecycle Events

Classes can implementation lifecycle interfaces:

1.  **OnModuleInit**: Called once when the module/provider is initialized.
2.  **OnApplicationBootstrap**: Called once when the application has fully started.

```typescript
@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    await this.connect();
  }
}
```

---
