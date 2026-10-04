import { GraphQLError, GraphQLScalarType, Kind, ValueNode } from 'graphql';

function fromLiteral(node: ValueNode, variables?: Record<string, unknown> | null): unknown {
  switch (node.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.ENUM:
      return node.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(node.value);
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return node.values.map((value) => fromLiteral(value, variables));
    case Kind.OBJECT:
      return Object.fromEntries(
        node.fields.map((field) => [field.name.value, fromLiteral(field.value, variables)]),
      );
    case Kind.VARIABLE:
      return variables?.[node.name.value];
  }
}

export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Any JSON value.',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: fromLiteral,
});

function toIsoString(value: unknown): string {
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) throw new GraphQLError('DateTime cannot represent an invalid date');
  return date.toISOString();
}

export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'An instant in ISO 8601 form, e.g. 2026-10-03T08:30:00.000Z.',
  serialize: toIsoString,
  parseValue: (value) => new Date(toIsoString(value)),
  parseLiteral: (node) => {
    if (node.kind !== Kind.STRING) throw new GraphQLError('DateTime must be a string');
    return new Date(toIsoString(node.value));
  },
});
