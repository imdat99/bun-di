import { HonoDiFactory, Controller, Get, Module, Injectable, Param, Post, Body, Delete, Patch, Put, Query } from '@hono-di/core';
import { hc } from 'hono/client';
import type { AppType } from './client'; // Generated types

@Injectable()
class CatsService {
    private cats: { id: string, name: string, age: number }[] = [];
    getCats() {
        return this.cats;
    }
    getCat(id: string) {
        return this.cats.find(cat => cat.id === id);
    }
    createCat(name: string, age: number) {
        this.cats.push({ id: this.cats.length.toString(), name, age });
        return { id: this.cats.length.toString(), name, age };
    }
    updateCat(id: string, name: string, age: number) {
        const cat = this.cats.find(cat => cat.id === id)!;
        cat.name = name;
        cat.age = age;
        return cat;
    }
}
interface CatDTO {
    id: string;
    name: string;
    age: number;
}
interface CreateCatDto {
    name: string;
    age: number;
}

@Controller('cats')
class CatsController {
    constructor(private readonly catsService: CatsService) { }

    @Get()
    findAll(@Query() query: { name?: string, age?: number }) {
        return this.catsService.getCats();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.catsService.getCat(id);
    }

    @Post()
    create(@Body() body: CreateCatDto) {
        return this.catsService.createCat(body.name, body.age);
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        this.catsService.getCats().splice(this.catsService.getCats().findIndex(cat => cat.id === id), 1);
        return { id };
    }
    @Put(':id')
    update(@Param('id') id: string, @Body() body: CreateCatDto) {
        return this.catsService.updateCat(id, body.name, body.age);
    }
}

@Module({
    controllers: [CatsController],
    providers: [CatsService],
})
class AppModule { }

async function bootstrap() {
    const app = await HonoDiFactory.create(AppModule);

    // Start server
    await app.listen(3001);
    console.log('Server running on http://localhost:3001');

    // Client usage
    const client = hc<AppType>('http://localhost:3001');

    const res = await client.cats.$get({ query: { name: 'cat', age: 1 } });
    const cats = await res.json();
    console.log('Cats:', cats);

    const res2 = await client.cats[':id'].$get({ param: { id: '123' } });
    const cat = await res2.json();
    const newCat = await client.cats.$post({ json: { name: 'new cat', age: 1 } });
    const updatedCat = await client.cats[':id'].$put({ param: { id: '123' }, json: { name: 'new cat', age: 2 } });
    const deletedCat = await client.cats[':id'].$delete({ param: { id: '123' } });
    const testRpc = await client.cats[':id'].$delete({ param: { id: '123' } });
    console.log('Cat:', cat);
    console.log('New cat:', newCat);
    console.log('Updated cat:', updatedCat);
    console.log('Deleted cat:', deletedCat);

    process.exit(0);
}

bootstrap();
