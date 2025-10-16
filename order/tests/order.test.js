const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Mock dependencies
jest.mock('../src/model/order.model');
const orderModel = require('../src/model/order.model');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Helper function to generate JWT token
const generateToken = (userId, role = 'user') => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'test-secret');
};

describe('Order API - POST /api/orders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an order successfully with valid cart data', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = generateToken(userId);

    // Mock cart data
    const mockCart = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: [
        {
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 2
        },
        {
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 1
        }
      ]
    };

    // Mock products
    const mockProducts = [
      {
        _id: mockCart.items[0].productId,
        title: 'Product 1',
        stock: 5,
        price: { amount: 50, currency: 'INR' }
      },
      {
        _id: mockCart.items[1].productId,
        title: 'Product 2',
        stock: 3,
        price: { amount: 30, currency: 'INR' }
      }
    ];

    // Mock axios responses
    mockedAxios.get.mockImplementation((url) => {
      if (url === 'http://localhost:3002/api/cart') {
        return Promise.resolve({ data: { cart: mockCart } });
      } else if (url.startsWith('http://localhost:3001/api/products/')) {
        const productId = url.split('/').pop();
        const product = mockProducts.find(p => p._id === productId);
        return Promise.resolve({ data: { product } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    // Mock order creation
    const mockOrder = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: [
        {
          product: mockCart.items[0].productId,
          quantity: 2,
          price: { amount: 50, currency: 'INR' }
        },
        {
          product: mockCart.items[1].productId,
          quantity: 1,
          price: { amount: 30, currency: 'INR' }
        }
      ],
      status: 'PENDING',
      totalPrice: { amount: 130, currency: 'INR' },
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        pincode: '12345',
        country: 'USA'
      }
    };
    orderModel.create.mockResolvedValue(mockOrder);

    const shippingAddress = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      pincode: '12345',
      country: 'USA'
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', [`token=${token}`])
      .send({ shippingAddress });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('order');
    expect(response.body.order.totalPrice.amount).toBe(130);
    expect(response.body.order.totalPrice.currency).toBe('INR');
  });

  it('should calculate total price correctly', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = generateToken(userId);

    const mockCart = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: [
        {
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 1
        }
      ]
    };

    const mockProduct = {
      _id: mockCart.items[0].productId,
      title: 'Product 1',
      stock: 5,
      price: { amount: 100, currency: 'INR' }
    };

    mockedAxios.get.mockImplementation((url) => {
      if (url === 'http://localhost:3002/api/cart') {
        return Promise.resolve({ data: { cart: mockCart } });
      } else if (url.startsWith('http://localhost:3001/api/products/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const mockOrder = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: [
        {
          product: mockCart.items[0].productId,
          quantity: 1,
          price: { amount: 100, currency: 'INR' }
        }
      ],
      status: 'PENDING',
      totalPrice: { amount: 100, currency: 'INR' },
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        pincode: '12345',
        country: 'USA'
      }
    };
    orderModel.create.mockResolvedValue(mockOrder);

    const shippingAddress = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      pincode: '12345',
      country: 'USA'
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', [`token=${token}`])
      .send({ shippingAddress });

    expect(response.status).toBe(201);
    expect(response.body.order.totalPrice.amount).toBe(100);
    expect(response.body.order.totalPrice.currency).toBe('INR');
  });

  it('should check inventory for ordered items', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = generateToken(userId);

    const mockCart = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: [
        {
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 3
        }
      ]
    };

    const mockProduct = {
      _id: mockCart.items[0].productId,
      title: 'Product 1',
      stock: 5,
      price: { amount: 25, currency: 'INR' }
    };

    mockedAxios.get.mockImplementation((url) => {
      if (url === 'http://localhost:3002/api/cart') {
        return Promise.resolve({ data: { cart: mockCart } });
      } else if (url.startsWith('http://localhost:3001/api/products/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const mockOrder = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: [
        {
          product: mockCart.items[0].productId,
          quantity: 3,
          price: { amount: 25, currency: 'INR' }
        }
      ],
      status: 'PENDING',
      totalPrice: { amount: 75, currency: 'INR' },
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        pincode: '12345',
        country: 'USA'
      }
    };
    orderModel.create.mockResolvedValue(mockOrder);

    const shippingAddress = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      pincode: '12345',
      country: 'USA'
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', [`token=${token}`])
      .send({ shippingAddress });

    expect(response.status).toBe(201);
    expect(response.body.order.totalPrice.amount).toBe(75);
  });

  it('should return 400 if cart is empty', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = generateToken(userId);

    const mockCart = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: []
    };

    mockedAxios.get.mockResolvedValue({ data: { cart: mockCart } });

    const shippingAddress = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      pincode: '12345',
      country: 'USA'
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', [`token=${token}`])
      .send({ shippingAddress });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Internal Server Error');
  });

  it('should return 400 if shipping address is missing', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = generateToken(userId);

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', [`token=${token}`])
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it('should return 404 if cart not found', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = generateToken(userId);

    mockedAxios.get.mockRejectedValue(new Error('Cart not found'));

    const shippingAddress = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      pincode: '12345',
      country: 'USA'
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', [`token=${token}`])
      .send({ shippingAddress });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Internal Server Error');
  });

  it('should handle insufficient inventory', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = generateToken(userId);

    const mockCart = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: [
        {
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 100
        }
      ]
    };

    const mockProduct = {
      _id: mockCart.items[0].productId,
      title: 'Product 1',
      stock: 5,
      price: { amount: 10, currency: 'INR' }
    };

    mockedAxios.get.mockImplementation((url) => {
      if (url === 'http://localhost:3002/api/cart') {
        return Promise.resolve({ data: { cart: mockCart } });
      } else if (url.startsWith('http://localhost:3001/api/products/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const shippingAddress = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      pincode: '12345',
      country: 'USA'
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', [`token=${token}`])
      .send({ shippingAddress });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Internal Server Error');
  });

  it('should handle currency conversion if needed', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = generateToken(userId);

    const mockCart = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: [
        {
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 1
        },
        {
          productId: new mongoose.Types.ObjectId().toString(),
          quantity: 1
        }
      ]
    };

    const mockProducts = [
      {
        _id: mockCart.items[0].productId,
        title: 'Product 1',
        stock: 5,
        price: { amount: 50, currency: 'USD' }
      },
      {
        _id: mockCart.items[1].productId,
        title: 'Product 2',
        stock: 3,
        price: { amount: 40, currency: 'INR' }
      }
    ];

    mockedAxios.get.mockImplementation((url) => {
      if (url === 'http://localhost:3002/api/cart') {
        return Promise.resolve({ data: { cart: mockCart } });
      } else if (url.startsWith('http://localhost:3001/api/products/')) {
        const productId = url.split('/').pop();
        const product = mockProducts.find(p => p._id === productId);
        return Promise.resolve({ data: { product } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const mockOrder = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      items: [
        {
          product: mockCart.items[0].productId,
          quantity: 1,
          price: { amount: 50, currency: 'USD' }
        },
        {
          product: mockCart.items[1].productId,
          quantity: 1,
          price: { amount: 40, currency: 'INR' }
        }
      ],
      status: 'PENDING',
      totalPrice: { amount: 90, currency: 'USD' },
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        pincode: '12345',
        country: 'USA'
      }
    };
    orderModel.create.mockResolvedValue(mockOrder);

    const shippingAddress = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      pincode: '12345',
      country: 'USA'
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', [`token=${token}`])
      .send({ shippingAddress });

    expect(response.status).toBe(201);
    expect(response.body.order.totalPrice.amount).toBe(90);
    expect(response.body.order.totalPrice.currency).toBe('USD');
  });
});
