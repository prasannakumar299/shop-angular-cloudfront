import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

const products = [
  {
    id: uuidv4(),
    title: 'Product One',
    description: 'Short Product Description1',
    price: 2400,
  },
  {
    id: uuidv4(),
    title: 'Product Two',
    description: 'Short Product Description2',
    price: 1300,
  },
  {
    id: uuidv4(),
    title: 'Product Three',
    description: 'Short Product Description3',
    price: 800,
  },
];

const stock = products.map((p, i) => ({
  product_id: p.id,
  count: i + 1, // count of the products listed above.
}));

// Lambda to fill the DynamoDB tables with initial data
export async function fillTables() {
  try {
    // Fill products table
    for (const p of products) {
      const productDB = new PutItemCommand({
        TableName: 'products',
        Item: {
          id: { S: p.id },
          title: { S: p.title },
          description: { S: p.description },
          price: { N: p.price.toString() },
        },
      });
      await dynamoDB.send(productDB);
      console.log('PutItem succeeded:', p.title);
    }

    // Fill stock table
    for (const s of stock) {
      const stockDB = new PutItemCommand({
        TableName: 'stock',
        Item: {
          product_id: { S: s.product_id },
          count: { N: s.count.toString() },
        },
      });
      await dynamoDB.send(stockDB);
      console.log('PutItem succeeded for stock:', s.product_id);
    }
    console.log(' All data inserted successfully!');
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Error adding item to DynamoDB table');
  }
}

// Lambda for GET /products
export const getProductsList = async () => {
  try {
    // Fetch both tables
    const productsData = await dynamoDB.send(
      new ScanCommand({ TableName: process.env.PRODUCTS_TABLE }),
    );
    const stockData = await dynamoDB.send(
      new ScanCommand({ TableName: process.env.STOCK_TABLE }),
    );

    const products =
      productsData.Items?.map((item) => ({
        id: item.id.S,
        title: item.title.S,
        description: item.description.S,
        price: Number(item.price.N),
      })) || [];

    const stock =
      stockData.Items?.map((item) => ({
        product_id: item.product_id.S,
        count: Number(item.count.N),
      })) || [];

    // Join products + stock
    const joined = products.map((p) => {
      const stockItem = stock.find((s) => s.product_id === p.id);
      return {
        ...p,
        count: stockItem ? stockItem.count : 0,
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(joined),
    };
  } catch (err) {
    console.error('Error fetching products:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

// Lambda for GET /products/{productId}
export const getProductById = async (event: {
  pathParameters?: { productId?: string };
}) => {
  const productId = event.pathParameters?.productId;

  if (!productId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing productId' }),
    };
  }

  try {
    // Get product
    const productResp = await dynamoDB.send(
      new GetItemCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Key: { id: { S: productId } },
      }),
    );

    if (!productResp.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Product not found' }),
      };
    }

    // Get stock
    const stockResp = await dynamoDB.send(
      new GetItemCommand({
        TableName: process.env.STOCK_TABLE,
        Key: { product_id: { S: productId } },
      }),
    );

    const product = {
      id: productResp.Item.id.S,
      title: productResp.Item.title.S,
      description: productResp.Item.description.S,
      price: Number(productResp.Item.price.N),
      count: stockResp.Item ? Number(stockResp.Item.count.N) : 0,
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

// Lambda for POST /products
export const createProduct = async (event: { body?: string }) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { title, description, price, count } = body;

    // Basic validation
    if (!title || !price || count === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Missing required fields: title, price, count',
        }),
      };
    }

    // Create product ID
    const id = uuidv4();

    // Insert into Products table
    await dynamoDB.send(
      new PutItemCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Item: {
          id: { S: id },
          title: { S: title },
          description: { S: description || '' },
          price: { N: price.toString() },
        },
      }),
    );

    // Insert into Stock table
    await dynamoDB.send(
      new PutItemCommand({
        TableName: process.env.STOCK_TABLE,
        Item: {
          product_id: { S: id },
          count: { N: count.toString() },
        },
      }),
    );

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Product created successfully',
        product: { id, title, description, price, count },
      }),
    };
  } catch (err) {
    console.error('Error creating product:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
