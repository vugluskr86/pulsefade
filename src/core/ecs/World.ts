/**
 * Минимальный ECS-мир.
 * Сущность — число, компонент — данные в отдельном хранилище, поведение живёт в системах.
 * ISP: системы получают только те компоненты, которые запрашивают.
 */
export type Entity = number;

export interface ComponentType<T> {
  readonly id: number;
  readonly name: string;
  /** Только для вывода типов, в рантайме не используется. */
  readonly __type?: T;
}

/** Стирание типа для сигнатур, которым конкретный T не важен. */
export type AnyComponentType = ComponentType<unknown>;

let componentCounter = 0;

export function defineComponent<T>(name: string): ComponentType<T> {
  return { id: componentCounter++, name };
}

export class World {
  private nextId: Entity = 1;
  private readonly entities = new Set<Entity>();
  private readonly stores = new Map<number, Map<Entity, unknown>>();
  private readonly doomed = new Set<Entity>();

  createEntity(): Entity {
    const entity = this.nextId++;
    this.entities.add(entity);
    return entity;
  }

  isAlive(entity: Entity): boolean {
    return this.entities.has(entity);
  }

  /** Удаление отложено до maintain(), чтобы не ломать обход внутри систем. */
  destroyEntity(entity: Entity): void {
    this.doomed.add(entity);
  }

  maintain(): void {
    if (this.doomed.size === 0) return;
    for (const entity of this.doomed) {
      this.entities.delete(entity);
      for (const store of this.stores.values()) store.delete(entity);
    }
    this.doomed.clear();
  }

  add<T>(entity: Entity, type: ComponentType<T>, value: NoInfer<T>): T {
    this.store(type).set(entity, value);
    return value;
  }

  get<T>(entity: Entity, type: ComponentType<T>): T | undefined {
    return this.store(type).get(entity);
  }

  require<T>(entity: Entity, type: ComponentType<T>): T {
    const value = this.store(type).get(entity);
    if (value === undefined) {
      throw new Error(`Entity ${entity} has no component "${type.name}"`);
    }
    return value;
  }

  has<T>(entity: Entity, type: ComponentType<T>): boolean {
    return this.store(type).has(entity);
  }

  remove<T>(entity: Entity, type: ComponentType<T>): void {
    this.store(type).delete(entity);
  }

  /** Сущности, у которых есть все перечисленные компоненты. */
  query(...types: readonly AnyComponentType[]): Entity[] {
    if (types.length === 0) return [...this.entities];
    let smallest = this.store(types[0] as AnyComponentType);
    for (const type of types) {
      const store = this.store(type);
      if (store.size < smallest.size) smallest = store;
    }
    const result: Entity[] = [];
    outer: for (const entity of smallest.keys()) {
      if (this.doomed.has(entity)) continue;
      for (const type of types) {
        if (!this.store(type).has(entity)) continue outer;
      }
      result.push(entity);
    }
    return result;
  }

  /** Быстрый обход одного компонента без промежуточного массива. */
  view<T>(type: ComponentType<T>): IterableIterator<[Entity, T]> {
    return this.store(type).entries();
  }

  countOf<T>(type: ComponentType<T>): number {
    return this.store(type).size;
  }

  clear(): void {
    this.entities.clear();
    this.stores.clear();
    this.doomed.clear();
    this.nextId = 1;
  }

  private store<T>(type: ComponentType<T>): Map<Entity, T> {
    let store = this.stores.get(type.id) as Map<Entity, T> | undefined;
    if (!store) {
      store = new Map<Entity, T>();
      this.stores.set(type.id, store as Map<Entity, unknown>);
    }
    return store;
  }
}
