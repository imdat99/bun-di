import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../trpc/routers/appRouter';

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
    }),
  ],
});

async function main() {
  try {
    console.log('--- Health Check ---');
    const health = await fetch('http://localhost:3000/health').then(r => r.json());
    console.log('Health:', health);

    console.log('\n--- Users ---');
    // Create User
    const newUser = await client.user.create.mutate({
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      name: 'Test User',
    });
    console.log('Created User:', newUser);

    // Get All Users
    const users = await client.user.getAll.query();
    console.log('All Users:', users);

    console.log('\n--- Products ---');
    // Create Product
    const newProduct = await client.product.create.mutate({
      name: 'New Gadget',
      description: 'Cool gadget',
      price: 199.99,
      stock: 50,
    });
    console.log('Created Product:', newProduct);

    // Adjust Stock
    const updatedProduct = await client.product.adjustStock.mutate({
      id: newProduct.id,
      quantity: -5,
    });
    console.log('Adjusted Stock:', updatedProduct);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
