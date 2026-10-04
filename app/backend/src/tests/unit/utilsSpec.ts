import { fromPostgres } from '../../middleware/error';
import { registerSchema } from '../../schemas/auth.schema';
import { hashPassword, verifyPassword } from '../../services/password.service';
import { displayName, rolesOf } from '../../services/token.service';
import { AppError } from '../../utils/errors';
import { haversineKm, isInsideThailand, parseLatLng, roadDistanceKm } from '../../utils/geo';
import { isTimeString, minutesToTime, timeToMinutes } from '../../utils/time';
import { parse } from '../../utils/validation';

describe('Time helpers', () => {
  it('convert between HH:mm and minutes, durations past 24 hours included', () => {
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('100:05')).toBe(6005);
    expect(minutesToTime(510)).toBe('08:30');
    expect(minutesToTime(-5)).toBe('00:00');
  });

  it('fall back on anything that is not a time', () => {
    expect(timeToMinutes('8.30', 99)).toBe(99);
    expect(timeToMinutes(null, 7)).toBe(7);
    expect(isTimeString('07:61')).toBe(false);
    expect(isTimeString(' 07:59 ')).toBe(true);
  });
});

describe('Geo helpers', () => {
  const bangNa = { latitude: 13.668, longitude: 100.634 };
  const rangsit = { latitude: 13.99, longitude: 100.617 };

  it('measure the distance between two depots', () => {
    const straight = haversineKm(bangNa, rangsit);
    expect(straight).toBeGreaterThan(35);
    expect(straight).toBeLessThan(37);
    expect(roadDistanceKm(bangNa, rangsit)).toBeGreaterThan(straight);
    expect(haversineKm(bangNa, bangNa)).toBe(0);
  });

  it('read a coordinate the way a planner types it', () => {
    expect(parseLatLng(' 13.75, 100.51 ')).toEqual({ latitude: 13.75, longitude: 100.51 });
    expect(parseLatLng('13.75;100.51')).toBeNull();
    expect(parseLatLng(13.75)).toBeNull();
  });

  it('tell a point in Thailand from one that is not', () => {
    expect(isInsideThailand(bangNa)).toBe(true);
    expect(isInsideThailand({ latitude: 100.634, longitude: 13.668 })).toBe(false);
  });
});

describe('Passwords', () => {
  it('are stored as a bcrypt hash, never as typed', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash.startsWith('$2')).toBe(true);
    expect(hash).not.toContain('correct horse');
  });

  it('match only the password that was hashed, however long it is', async () => {
    const long = 'a'.repeat(200);
    const hash = await hashPassword(long);
    expect(await verifyPassword(long, hash)).toBe(true);
    expect(await verifyPassword('a'.repeat(199), hash)).toBe(false);
  });
});

describe('Roles', () => {
  it('give an admin the planner role as well', () => {
    expect(rolesOf('Admin')).toEqual(['Admin', 'BRS']);
    expect(rolesOf('BRS')).toEqual(['BRS']);
  });

  it('show the username when an account has no name', () => {
    expect(displayName({ firstName: 'Jane', lastName: 'Doe', username: 'jane' })).toBe('Jane Doe');
    expect(displayName({ firstName: '', lastName: '', username: 'jane' })).toBe('jane');
  });
});

describe('Request validation', () => {
  const problem = (input: unknown): string => {
    try {
      parse(registerSchema, input);
      return '';
    } catch (err) {
      return err instanceof AppError ? `${err.statusCode} ${err.message}` : String(err);
    }
  };

  it('trims what it accepts and drops fields the schema does not name', () => {
    const input = parse(registerSchema, { username: '  jane.doe ', password: 'goodpass123', role: 'Admin' });
    expect(input).toEqual({ username: 'jane.doe', password: 'goodpass123' });
  });

  it('names the field and the rule it breaks', () => {
    expect(problem({ password: 'goodpass123' })).toBe('400 username is required');
    expect(problem({ username: 'ab', password: 'goodpass123' })).toBe(
      '400 username must be at least 3 characters',
    );
    expect(problem({ username: 'jane doe', password: 'goodpass123' })).toBe(
      '400 username may only contain letters, digits and . _ @ + -',
    );
    expect(problem({ username: 'jane', password: 'x'.repeat(129) })).toBe(
      '400 password must be at most 128 characters',
    );
  });
});

describe('Database errors', () => {
  it('turn a broken constraint into a message a client can act on', () => {
    expect(fromPostgres({ code: '23505', constraint: 'users_username_lower_key' })).toEqual({
      statusCode: 409,
      code: 'conflict',
      message: 'Username already exists',
    });
    expect(fromPostgres({ code: '22P02' })?.statusCode).toBe(400);
  });

  it('leave anything else to the generic 500', () => {
    expect(fromPostgres({ code: '08006' })).toBeNull();
  });
});
