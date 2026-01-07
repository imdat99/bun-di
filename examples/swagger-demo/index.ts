import { Hono } from 'hono';
import { HonoDiFactory, Controller, Get, Module, Injectable, Param } from '@hono-di/core';
import { SwaggerModule, DocumentBuilder, ApiTags, ApiOperation, ApiResponse } from '@hono-di/swagger';

@Injectable()
class CatsService {
    getCats() {
        return ['Cat 1', 'Cat 2'];
    }
}

@ApiTags('cats')
@Controller('cats')
class CatsController {
    constructor(private readonly catsService: CatsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all cats' })
    @ApiResponse({ status: 200, description: 'Return all cats.' })
    findAll() {
        return this.catsService.getCats();
    }
    @Get(':name')
    @ApiOperation({ summary: 'Get cat by name' })
    @ApiResponse({ status: 200, description: 'Return cat by name.' })
    getByName(@Param('name') name: string) {
        return this.catsService.getCats().find(cat => cat === name);
    }
}

@Module({
    controllers: [CatsController],
    providers: [CatsService],
})
class AppModule { }

async function bootstrap() {
    const app = await HonoDiFactory.create(AppModule);

    const config = new DocumentBuilder()
        .setTitle('Cats example')
        .setDescription('The cats API description')
        .setVersion('1.0')
        .addTag('cats')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.listen(3000);
    console.log('Server running on http://localhost:3000');
    console.log('Swagger UI on http://localhost:3000/api');
}

bootstrap();
