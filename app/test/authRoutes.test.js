const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({ getConnection: jest.fn() }));
jest.mock('../utils/hash', () => ({ hashPassword: jest.fn(), comparePassword: jest.fn() }));

const pool = require('../db');
const { hashPassword, comparePassword } = require('../utils/hash');
const authRouter = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

test('register success', async () => {
  const query = jest.fn().mockResolvedValue([]);
  pool.getConnection.mockResolvedValue({ query, release: jest.fn() });
  hashPassword.mockResolvedValue('hash');
  const res = await request(app).post('/api/auth/register').send({
    username: 'user1',
    password: 'Password1',
    email: 'user@example.com'
  });
  expect(res.status).toBe(200);
  expect(res.body.verifyToken).toBeDefined();
});

test('register failure with weak password', async () => {
  const res = await request(app).post('/api/auth/register').send({
    username: 'user1',
    password: 'short',
    email: 'user@example.com'
  });
  expect(res.status).toBe(400);
});

test('login success', async () => {
  const userRow = { id: 1, password_hash: 'hash', intentos: 0, bloqueado: 0, activo: 1 };
  const query = jest.fn()
    .mockResolvedValueOnce([[userRow]])
    .mockResolvedValue([]);
  pool.getConnection.mockResolvedValue({ query, release: jest.fn() });
  comparePassword.mockResolvedValue(true);
  const res = await request(app).post('/api/auth/login').send({
    username: 'user1',
    password: 'Password1'
  });
  expect(res.status).toBe(200);
  expect(res.body.message).toMatch(/Login exitoso/);
});

test('login failure with wrong password', async () => {
  const userRow = { id: 1, password_hash: 'hash', intentos: 0, bloqueado: 0, activo: 1 };
  const query = jest.fn()
    .mockResolvedValueOnce([[userRow]])
    .mockResolvedValue([]);
  pool.getConnection.mockResolvedValue({ query, release: jest.fn() });
  comparePassword.mockResolvedValue(false);
  const res = await request(app).post('/api/auth/login').send({
    username: 'user1',
    password: 'wrong'
  });
  expect(res.status).toBe(401);
});

test('reset-password success', async () => {
  const tokenRow = { user_id: 1, expires: '2999-12-31' };
  const query = jest.fn()
    .mockResolvedValueOnce([[tokenRow]])
    .mockResolvedValue([]);
  pool.getConnection.mockResolvedValue({ query, release: jest.fn() });
  hashPassword.mockResolvedValue('hash');
  const res = await request(app).post('/api/auth/reset-password').send({
    token: 'tok123',
    newPassword: 'Password1',
    confirmPassword: 'Password1'
  });
  expect(res.status).toBe(200);
});

test('reset-password failure with invalid token', async () => {
  const query = jest.fn().mockResolvedValue([[]]);
  pool.getConnection.mockResolvedValue({ query, release: jest.fn() });
  const res = await request(app).post('/api/auth/reset-password').send({
    token: 'bad',
    newPassword: 'Password1',
    confirmPassword: 'Password1'
  });
  expect(res.status).toBe(400);
});
