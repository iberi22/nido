import { describe, it, expect } from 'vitest';
import { validateStairs, validateGarage, validateProperty, RULES } from '../../src/lib/domain/norms';
import houseData from '../../src/lib/data/house-data.json';

describe('norms validation engine', () => {
  describe('validateStairs', () => {
    it('should pass on valid stairs (e.g., ground floor stairs from house-data.json)', () => {
      const zone = {
        id: 'entrance',
        name: 'INGRESO',
        type: 'staircase',
        stairs: {
          type: 'L',
          totalSteps: 23,
          riser_mm: 174,
          tread_mm: 280,
          totalRise_m: 4.0
        }
      };

      const result = validateStairs(zone);
      expect(result.pass).toBe(true);
      expect(result.severity).toBe('pass');
      expect(result.message).toContain('comply');
    });

    it('should fail if riser is out of allowed range [100, 180]mm', () => {
      const zoneTooLow = {
        id: 'entrance',
        name: 'INGRESO',
        type: 'staircase',
        stairs: {
          riser_mm: 90,
          tread_mm: 280
        }
      };

      const resultTooLow = validateStairs(zoneTooLow);
      expect(resultTooLow.pass).toBe(false);
      expect(resultTooLow.severity).toBe('fail');
      expect(resultTooLow.message).toContain('Riser height');

      const zoneTooHigh = {
        id: 'entrance',
        name: 'INGRESO',
        type: 'staircase',
        stairs: {
          riser_mm: 190,
          tread_mm: 280
        }
      };

      const resultTooHigh = validateStairs(zoneTooHigh);
      expect(resultTooHigh.pass).toBe(false);
      expect(resultTooHigh.severity).toBe('fail');
      expect(resultTooHigh.message).toContain('Riser height');
    });

    it('should fail if tread is below minimum allowed 280mm', () => {
      const zone = {
        id: 'entrance',
        name: 'INGRESO',
        type: 'staircase',
        stairs: {
          riser_mm: 170,
          tread_mm: 270
        }
      };

      const result = validateStairs(zone);
      expect(result.pass).toBe(false);
      expect(result.severity).toBe('fail');
      expect(result.message).toContain('Tread width');
    });

    it('should fail if 2R+H formula is outside [620, 640]mm', () => {
      const zone = {
        id: 'entrance',
        name: 'INGRESO',
        type: 'staircase',
        stairs: {
          riser_mm: 180,
          tread_mm: 270 // 2R+H = 360 + 270 = 630 (valid formula, but tread < 280)
        }
      };

      // Let's make one where riser/tread are individually valid, but 2R+H is invalid:
      // R = 150, H = 340 (2R+H = 300 + 340 = 640. Wait, R=150, H=350 -> 650)
      const zoneFormulaHigh = {
        id: 'entrance',
        name: 'INGRESO',
        type: 'staircase',
        stairs: {
          riser_mm: 150,
          tread_mm: 350 // 2R+H = 650
        }
      };

      const result = validateStairs(zoneFormulaHigh);
      expect(result.pass).toBe(false);
      expect(result.severity).toBe('fail');
      expect(result.message).toContain('formula');
    });
  });

  describe('validateGarage', () => {
    it('should pass if width, depth, and independent access meet POT minimums', () => {
      const zone = {
        id: 'garage',
        name: 'GARAJE',
        type: 'garage',
        width: 2.60,
        height: 5.00,
        properties: {
          accessWidth_independent_m: 3.20
        }
      };

      const result = validateGarage(zone);
      expect(result.pass).toBe(true);
      expect(result.severity).toBe('pass');
    });

    it('should fail if width is below 2.60m', () => {
      const zone = {
        id: 'garage',
        name: 'GARAJE',
        type: 'garage',
        width: 2.50,
        height: 5.00,
        properties: {
          accessWidth_independent_m: 3.20
        }
      };

      const result = validateGarage(zone);
      expect(result.pass).toBe(false);
      expect(result.severity).toBe('fail');
      expect(result.message).toContain('width');
    });

    it('should fail if depth is below 5.00m', () => {
      const zone = {
        id: 'garage',
        name: 'GARAJE',
        type: 'garage',
        width: 2.60,
        height: 4.80,
        properties: {
          accessWidth_independent_m: 3.20
        }
      };

      const result = validateGarage(zone);
      expect(result.pass).toBe(false);
      expect(result.severity).toBe('fail');
      expect(result.message).toContain('depth');
    });

    it('should fail if independent access is below 3.20m', () => {
      const zone = {
        id: 'garage',
        name: 'GARAJE',
        type: 'garage',
        width: 2.60,
        height: 5.00,
        properties: {
          accessWidth_independent_m: 3.00
        }
      };

      const result = validateGarage(zone);
      expect(result.pass).toBe(false);
      expect(result.severity).toBe('fail');
      expect(result.message).toContain('access width');
    });
  });

  describe('validateProperty', () => {
    it('should run validation across floors in houseData', () => {
      const violations = validateProperty(houseData);
      expect(violations.length).toBeGreaterThan(0);

      // Verify shape of returned violations
      const stairViolation = violations.find(v => v.ruleId === 'NSR10_stairs');
      const garageViolation = violations.find(v => v.ruleId === 'POT_garage');

      if (stairViolation) {
        expect(stairViolation.severity).toBeDefined();
        expect(stairViolation.message).toBeDefined();
        expect(stairViolation.fixHint).toBeDefined();
      }

      if (garageViolation) {
        expect(garageViolation.severity).toBeDefined();
        expect(garageViolation.message).toBeDefined();
        expect(garageViolation.fixHint).toBeDefined();
      }
    });

    it('should find garage POT violations on the ground floor of house-data.json', () => {
      const violations = validateProperty(houseData);

      // Ground floor garage has width: 2.5 (POT min: 2.60) and access (door) width: 2.2 (POT min: 3.20)
      const garageViolations = violations.filter(v => v.ruleId === 'POT_garage' && v.zoneId === 'garage');
      expect(garageViolations.length).toBeGreaterThan(0);

      const combinedMessage = garageViolations.map(v => v.message).join(' ');
      expect(combinedMessage).toContain('width');
      expect(combinedMessage).toContain('access width');
    });
  });
});
