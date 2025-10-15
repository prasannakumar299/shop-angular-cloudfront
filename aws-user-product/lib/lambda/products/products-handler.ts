import * as products from './products.json';

interface Product {
  count: number;
  description: string;
  id: string;
  price: number;
  title: string;
}

export async function getProductsList() {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(products),
  };
}

export async function getProductsById(event: {
  pathParameters: { id: string };
}) {
  console.log('EVENT:', JSON.stringify(event));
  const productId = event?.pathParameters?.id;
  console.log(productId, 'productId');

  const product = products.find((p: Product) => p.id === productId);
  console.log(product, 'product');
  if (!product) {
    console.log(productId, 'productId');

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Product not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  };
}
