import type { BeatKind } from '../../domain/Beat';
import { ChoiceResolver } from './ChoiceResolver';
import { DoubleResolver } from './DoubleResolver';
import { HoldResolver } from './HoldResolver';
import { TapResolver } from './TapResolver';
import type { IBeatResolver } from './types';

export class BeatResolverRegistry {
  private readonly map = new Map<BeatKind, IBeatResolver>();

  constructor(resolvers: readonly IBeatResolver[]) {
    for (const resolver of resolvers) this.map.set(resolver.kind, resolver);
  }

  get(kind: BeatKind): IBeatResolver {
    const resolver = this.map.get(kind);
    if (!resolver) throw new Error(`Нет резолвера для события "${kind}"`);
    return resolver;
  }
}

export function createDefaultResolvers(): BeatResolverRegistry {
  return new BeatResolverRegistry([
    new TapResolver(),
    new DoubleResolver(),
    new HoldResolver(),
    new ChoiceResolver(),
  ]);
}
