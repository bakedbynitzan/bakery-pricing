import { describe, it, expect } from 'vitest';
import { convertUnit, ingredientCost, ingredientsTotalCost, hasInvalidUnits } from './units';
import { Ingredient, RecipeIngredient } from '../types';

const makeIng = (over: Partial<Ingredient>): Ingredient => ({
  id: 'i1',
  name: 'test',
  pricePerUnit: 1,
  packagePrice: 10,
  packageQuantity: 10,
  unit: 'g',
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe('convertUnit', () => {
  it('returns same quantity for identical units', () => {
    expect(convertUnit(5, 'g', 'g')).toBe(5);
  });

  it('converts kg <-> g', () => {
    expect(convertUnit(2, 'kg', 'g')).toBe(2000);
    expect(convertUnit(500, 'g', 'kg')).toBe(0.5);
  });

  it('converts l <-> ml', () => {
    expect(convertUnit(1, 'l', 'ml')).toBe(1000);
    expect(convertUnit(250, 'ml', 'l')).toBe(0.25);
  });

  it('converts spoons/cups to ml', () => {
    expect(convertUnit(1, 'tbsp', 'ml')).toBe(15);
    expect(convertUnit(1, 'tsp', 'ml')).toBe(5);
    expect(convertUnit(1, 'cup', 'ml')).toBe(240);
  });

  it('treats gram and ml as 1:1 (baking density ~1)', () => {
    expect(convertUnit(100, 'g', 'ml')).toBe(100);
    expect(convertUnit(100, 'ml', 'g')).toBe(100);
    expect(convertUnit(1, 'kg', 'ml')).toBe(1000);
  });

  it('returns null for incompatible count <-> mass/volume', () => {
    expect(convertUnit(3, 'unit', 'g')).toBeNull();
    expect(convertUnit(100, 'g', 'unit')).toBeNull();
    expect(convertUnit(1, 'unit', 'ml')).toBeNull();
  });
});

describe('ingredientCost', () => {
  const ings = [makeIng({ id: 'flour', unit: 'kg', pricePerUnit: 5 })]; // 5 ₪/kg

  it('computes cost with unit conversion', () => {
    const ri: RecipeIngredient = { ingredientId: 'flour', quantity: 200, unit: 'g' };
    const res = ingredientCost(ri, ings);
    expect(res.valid).toBe(true);
    expect(res.cost).toBeCloseTo(1.0, 5); // 200g = 0.2kg * 5 = 1
  });

  it('flags invalid conversion (unit vs mass)', () => {
    const eggIngs = [makeIng({ id: 'egg', unit: 'unit', pricePerUnit: 1 })];
    const ri: RecipeIngredient = { ingredientId: 'egg', quantity: 100, unit: 'g' };
    const res = ingredientCost(ri, eggIngs);
    expect(res.valid).toBe(false);
    expect(res.cost).toBe(0);
  });

  it('returns invalid + 0 when ingredient missing', () => {
    const ri: RecipeIngredient = { ingredientId: 'nope', quantity: 1, unit: 'g' };
    const res = ingredientCost(ri, ings);
    expect(res.valid).toBe(false);
    expect(res.cost).toBe(0);
  });
});

describe('ingredientsTotalCost & hasInvalidUnits', () => {
  const ings = [
    makeIng({ id: 'a', unit: 'g', pricePerUnit: 2 }),
    makeIng({ id: 'egg', unit: 'unit', pricePerUnit: 1.5 }),
  ];

  it('sums valid ingredient costs (skips invalid silently)', () => {
    const list: RecipeIngredient[] = [
      { ingredientId: 'a', quantity: 10, unit: 'g' }, // 20
      { ingredientId: 'egg', quantity: 3, unit: 'unit' }, // 4.5
    ];
    expect(ingredientsTotalCost(list, ings)).toBeCloseTo(24.5, 5);
  });

  it('detects invalid units', () => {
    const bad: RecipeIngredient[] = [{ ingredientId: 'egg', quantity: 50, unit: 'g' }];
    expect(hasInvalidUnits(bad, ings)).toBe(true);
    const good: RecipeIngredient[] = [{ ingredientId: 'a', quantity: 5, unit: 'g' }];
    expect(hasInvalidUnits(good, ings)).toBe(false);
  });
});
