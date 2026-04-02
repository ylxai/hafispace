import { Prisma } from '@prisma/client';
import { describe, expect,it } from 'vitest';

import { convertDecimalToNumber } from '../decimal';

describe('convertDecimalToNumber', () => {
  it('should convert Prisma.Decimal to number', () => {
    const decimal = new Prisma.Decimal('123.45');
    const result = convertDecimalToNumber(decimal);
    expect(result).toBe(123.45);
    expect(typeof result).toBe('number');
  });

  it('should preserve null and undefined', () => {
    expect(convertDecimalToNumber(null)).toBe(null);
    expect(convertDecimalToNumber(undefined)).toBe(undefined);
  });

  it('should preserve Date objects', () => {
    const date = new Date('2024-01-01');
    const result = convertDecimalToNumber(date);
    expect(result).toBe(date);
    expect(result instanceof Date).toBe(true);
  });

  it('should preserve Map, Set, RegExp, Error', () => {
    const map = new Map([['key', 'value']]);
    const set = new Set([1, 2, 3]);
    const regex = /test/i;
    const error = new Error('test error');

    expect(convertDecimalToNumber(map)).toBe(map);
    expect(convertDecimalToNumber(set)).toBe(set);
    expect(convertDecimalToNumber(regex)).toBe(regex);
    expect(convertDecimalToNumber(error)).toBe(error);
  });

  it('should recursively convert Decimal in nested objects', () => {
    const input = {
      name: 'Test',
      price: new Prisma.Decimal('99.99'),
      nested: {
        amount: new Prisma.Decimal('50.50'),
        date: new Date('2024-01-01'),
      },
    };

    const result = convertDecimalToNumber(input);
    
    expect(result.price).toBe(99.99);
    expect(result.nested.amount).toBe(50.50);
    expect(result.nested.date instanceof Date).toBe(true);
  });

  it('should recursively convert Decimal in arrays', () => {
    const input = [
      new Prisma.Decimal('10.5'),
      new Prisma.Decimal('20.75'),
      { value: new Prisma.Decimal('30.25') },
    ];

    const result = convertDecimalToNumber(input);
    
    expect(result[0]).toBe(10.5);
    expect(result[1]).toBe(20.75);
    expect(result[2].value).toBe(30.25);
  });

  it('should preserve plain objects created with Object.create(null)', () => {
    const nullProtoObj = Object.create(null);
    nullProtoObj.decimal = new Prisma.Decimal('123');
    
    const result = convertDecimalToNumber(nullProtoObj);
    expect(result.decimal).toBe(123);
  });

  it('should preserve class instances (not plain objects)', () => {
    class CustomClass {
      value = new Prisma.Decimal('100');
    }
    
    const instance = new CustomClass();
    const result = convertDecimalToNumber(instance);
    
    // Class instance should be preserved as-is
    expect(result).toBe(instance);
    expect(result instanceof CustomClass).toBe(true);
  });

  it('should preserve primitives', () => {
    expect(convertDecimalToNumber('string')).toBe('string');
    expect(convertDecimalToNumber(42)).toBe(42);
    expect(convertDecimalToNumber(true)).toBe(true);
    expect(convertDecimalToNumber(false)).toBe(false);
  });
});
