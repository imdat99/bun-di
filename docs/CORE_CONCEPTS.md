# BunDI Core Framework Concepts

This project uses a custom framework architecture inspired by NestJS, built on top of **Hono**. It features a built-in Dependency Injection (DI) system compatible with NestJS semantics.

## 1. Modules

Modules are the building blocks of the application. They group related components (Controllers, Providers) together.

### `@Module(options)`

Use the `@Module` decorator to define a module.

```typescript
import { Module } from '../core/decorators';
import { UserController } from './controllers/UserController';
import { UserService } from './services/UserService';

@Module({
  imports: [], // List of imported Modules
  controllers: [UserController], // List of Controllers
  providers: [UserService], // List of Providers/Services
  exports: [UserService], // Export providers to be used by other modules
})
export class UserModule {}
```

## 2. Controllers

Controllers are responsible for handling incoming HTTP requests and returning responses to the client.

### `@Controller(prefix)`

Defines a controller with a base route prefix.

```typescript
import { Controller, Get, Post } from '../core/decorators';
import { Context } from 'hono';
import { UserService } from '../services/UserService'; // Import Service

@Controller('users')
export class UserController {
  // Services are automatically injected via constructor
  constructor(private userService: UserService) {}

  @Get('/')
  async getAll(c: Context) {
    return c.json(await this.userService.findAll());
  }
}
```

## 3. Dependency Injection (Built-in)

The framework includes a custom DI engine that supports Singleton, Request, and Transient scopes.

### Defining Providers `@Injectable()`

```typescript
import { Injectable } from '../core/decorators';
import { Scope } from '../core/injector/scope';

@Injectable({ scope: Scope.DEFAULT }) // Default is Singleton
export class UserService {
  findAll() { ... }
}
```

### Scopes
- **`Scope.DEFAULT` (Singleton)**: One instance shared across the entire application.
- **`Scope.REQUEST`**: A new instance is created for each incoming request.
- **`Scope.TRANSIENT`**: A new instance is created every time it is injected.

### Injection
Dependencies are injected through the constructor.

```typescript
constructor(private readonly helper: HelperService) {}
```

You can also use `@Inject(token)` for specific tokens.

## 4. Exception Filters

Exception filters allow you to handle errors across your application in a declarative way.

```typescript
@Catch(BadRequestException)
export class CustomFilter implements ExceptionFilter { ... }
```

## 5. Bootstrap

The application is bootstrapped using `BunDIFactory`.

```typescript
import { Hono } from 'hono';
import { BunDIFactory } from './core/factory';
import { AppModule } from './AppModule';

const app = new Hono();
BunDIFactory.create(AppModule, app);
export default app;
```

---

## 🏗️ Internal Architecture (Advanced)

For developers interested in the framework internals, here is how the DI engine works:

### 1. The Container (`src/core/injector/container.ts`)
The `Container` is the global registry/state that holds all registered `Modules`. It does NOT handle instantiation logic directly but acts as the graph owner.

### 2. NestScanner (`src/core/scanner.ts`)
The Scanner is responsible for the "Graph Building Phase":
1.  Recursively scans the root module and its `imports`.
2.  Reads `@Module` metadata (`providers`, `controllers`, `exports`).
3.  Creates `InstanceWrapper` objects for every component.
4.  Populates the `Container`.

### 3. InstanceWrapper (`src/core/injector/instance-wrapper.ts`)
Every provider or controller is wrapped in an `InstanceWrapper`. This object holds:
-   `token`: The injection token.
-   `metatype`: The class constructor.
-   `scope`: Singleton, Request, or Transient.
-   `instance`: The resolved singleton instance.
-   `instancesPerContext`: Map of instances for Request-Scoped providers.

### 4. Injector (`src/core/injector/injector.ts`)
The `Injector` contains the logic for "Resolution Phase":
-   **`resolve(token, contextId, module)`**:
    -   Looks up the `InstanceWrapper` in the current module.
    -   If not found, looks in `imports` (only if exported).
    -   Resolves dependencies recursively via `resolveConstructorParams`.
    -   Handles **Lifecycle Hooks** (TODO in Phase 4).
    -   Detects **Circular Dependencies**.

### 5. ContextId (`src/core/injector/context-id.ts`)
A unique `ContextId` is generated for every Request. This ID is passed down the entire resolution tree.
-   **Singleton**: ID is ignored.
-   **Request-Scoped**: Instance is stored/retrieved from `wrapper.instancesPerContext.get(id)`.
