import {
  ASTVisitor,
  FragmentDefinitionNode,
  GraphQLError,
  Kind,
  SelectionSetNode,
  ValidationContext,
} from 'graphql';

// A query can nest as deep as its author likes; the web app never goes past five levels. Refusing
// anything far beyond that keeps one request from fanning out into an unbounded amount of work
// (OWASP API4)
export function depthLimit(maxDepth: number) {
  return (context: ValidationContext): ASTVisitor => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of context.getDocument().definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) fragments.set(definition.name.value, definition);
    }

    const depthOf = (selectionSet: SelectionSetNode | undefined, seen: Set<string>): number => {
      if (!selectionSet) return 0;
      let deepest = 0;
      for (const selection of selectionSet.selections) {
        if (selection.kind === Kind.FIELD) {
          // Introspection nests by design and is switched off separately where it should be
          if (selection.name.value.startsWith('__')) continue;
          deepest = Math.max(deepest, 1 + depthOf(selection.selectionSet, seen));
        } else if (selection.kind === Kind.INLINE_FRAGMENT) {
          deepest = Math.max(deepest, depthOf(selection.selectionSet, seen));
        } else if (!seen.has(selection.name.value)) {
          const fragment = fragments.get(selection.name.value);
          deepest = Math.max(
            deepest,
            depthOf(fragment?.selectionSet, new Set(seen).add(selection.name.value)),
          );
        }
      }
      return deepest;
    };

    return {
      OperationDefinition(node) {
        const depth = depthOf(node.selectionSet, new Set());
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(`Query is nested ${depth} levels deep; the limit is ${maxDepth}.`, {
              nodes: [node],
            }),
          );
        }
      },
    };
  };
}
