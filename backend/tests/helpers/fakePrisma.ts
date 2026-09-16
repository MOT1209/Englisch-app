/**
 * In-memory stand-in for the Prisma client, so integration tests exercise the
 * real Express routes/controllers without a Postgres instance.
 *
 * It implements exactly the operations the controllers use: finds by `where`,
 * list filters (OR/AND, `in`, `equals`, compound composite keys), ordering via
 * `orderBy` ({ field: 'asc'|'desc' } or an array of those), create/update (with
 * `{ increment }` support), upsert and count. `select`/`include` are ignored and
 * the full stored record is returned — the seed stores nested relation objects
 * (e.g. `language: { code }`) so controllers that read joins get the same shape
 * they would from a real `include`.
 */

type Where = Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function matches(record: Record<string, unknown>, where: Where | undefined): boolean {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR') {
      if (!(value as Where[]).some((w) => matches(record, w))) return false;
      continue;
    }
    if (key === 'AND') {
      if (!(value as Where[]).every((w) => matches(record, w))) return false;
      continue;
    }
    if (isObject(value)) {
      if ('in' in value && Array.isArray(value.in)) {
        if (!value.in.includes(record[key])) return false;
      } else if ('equals' in value) {
        if (record[key] !== value.equals) return false;
      } else {
        // Compound composite key, e.g. { userId_lessonId: { userId, lessonId } }.
        const compoundMatches = Object.entries(value).every(([subKey, subValue]) => record[subKey] === subValue);
        if (!compoundMatches) return false;
      }
    } else if (record[key] !== value) {
      return false;
    }
  }
  return true;
}

function applyUpdate(record: Record<string, unknown>, data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (isObject(value) && 'increment' in value && Number.isFinite(value.increment)) {
      record[key] = ((record[key] as number) ?? 0) + (value.increment as number);
    } else if (value !== undefined) {
      record[key] = value;
    }
  }
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function makeComparator(
  orderBy: Record<string, unknown>[] | Record<string, unknown> | undefined
): ((x: Record<string, unknown>, y: Record<string, unknown>) => number) | undefined {
  if (!orderBy) return undefined;
  const criteria = (Array.isArray(orderBy) ? orderBy : [orderBy]).filter((c) => c && typeof c === 'object');
  if (criteria.length === 0) return undefined;
  return (x, y) => {
    for (const criterion of criteria) {
      for (const [field, dir] of Object.entries(criterion)) {
        const res = compareValues(x[field], y[field]);
        if (res !== 0) return String(dir).toLowerCase() === 'desc' ? -res : res;
      }
    }
    return 0;
  };
}

const MODELS = [
  'user',
  'language',
  'cefrLevel',
  'unit',
  'lesson',
  'exercise',
  'vocabulary',
  'grammarRule',
  'flashcard',
  'userLanguage',
  'userLessonProgress',
  'userExerciseProgress',
  'userVocabularyProgress',
  'userAchievement',
  'achievement',
  'chatMessage',
  'aiUsage',
];

export class FakePrismaClient {
  models: Record<string, Record<string, unknown>[]> = {};
  $queryRaw: (...args: unknown[]) => Promise<unknown> = async () => [{ '1': 1 }];
  $connect: () => Promise<void> = async () => {};

  private defaultSeed: Record<string, unknown[]> = {};

  constructor(seed: Record<string, unknown[]> = {}) {
    this.defaultSeed = seed;
    this.reset();
  }

  reset(seed?: Record<string, unknown[]>): void {
    const source = seed ?? this.defaultSeed;
    const cloned: Record<string, Record<string, unknown>[]> = {};
    for (const [name, rows] of Object.entries(source)) {
      cloned[name] = (rows ?? []).map((row) => structuredClone(row)) as Record<string, unknown>[];
    }
    this.models = cloned;
  }

  private table(name: string): Record<string, unknown>[] {
    if (!this.models[name]) this.models[name] = [];
    return this.models[name];
  }

  private apiFor(name: string): Record<string, (...args: any[]) => any> {
    const table = () => this.table(name);
    const nextId = () => `fake-${name}-${table().length + 1}`;

    return {
      findUnique: ({ where }: { where: Where }) => table().find((row) => matches(row, where)),
      findFirst: ({ where }: { where: Where }) => table().find((row) => matches(row, where)),
      findMany: ({ where, orderBy }: { where?: Where; orderBy?: Record<string, unknown>[] | Record<string, unknown> }) => {
        const comparator = makeComparator(orderBy);
        return table().filter((row) => matches(row, where)).sort(comparator ?? (() => 0));
      },
      count: ({ where }: { where?: Where } = {}) => table().filter((row) => matches(row, where)).length,
      create: ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: nextId(), ...structuredClone(data) };
        table().push(record);
        return record;
      },
      update: ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
        const record = table().find((row) => matches(row, where));
        if (!record) throw new Error(`FakePrisma: ${name}.update matched nothing`);
        applyUpdate(record, data);
        return structuredClone(record);
      },
      upsert: ({ where, update, create }: { where: Where; update: Record<string, unknown>; create: Record<string, unknown> }) => {
        const existing = table().find((row) => matches(row, where));
        if (existing) {
          applyUpdate(existing, update ?? {});
          return structuredClone(existing);
        }
        const record = { id: nextId(), ...structuredClone(create ?? {}) };
        table().push(record);
        return structuredClone(record);
      },
      delete: ({ where }: { where: Where }) => {
        const index = table().findIndex((row) => matches(row, where));
        if (index < 0) throw new Error(`FakePrisma: ${name}.delete matched nothing`);
        const [removed] = table().splice(index, 1);
        return structuredClone(removed);
      },
    };
  }

  constructorWithProxy(): FakePrismaClient {
    for (const model of MODELS) {
      (this as Record<string, unknown>)[model] = this.apiFor(model);
    }
    return this;
  }
}

export function buildMockPrisma(seed: Record<string, unknown[]> = {}): FakePrismaClient {
  const client = new FakePrismaClient(seed) as FakePrismaClient;
  for (const model of MODELS) {
    (client as unknown as Record<string, unknown>)[model] = client.apiFor(model);
  }
  return client;
}