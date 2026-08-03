import type { GameContext } from '../../game/GameContext';

/**
 * SRP: одна система — одна ответственность.
 * OCP: конвейер расширяется добавлением системы, а не правкой цикла.
 */
export interface ISystem {
  readonly name: string;
  update(dt: number, ctx: GameContext): void;
  dispose?(): void;
}

export class SystemPipeline {
  private readonly systems: ISystem[] = [];

  add(...systems: readonly ISystem[]): this {
    this.systems.push(...systems);
    return this;
  }

  update(dt: number, ctx: GameContext): void {
    for (const system of this.systems) system.update(dt, ctx);
    ctx.world.maintain();
  }

  dispose(): void {
    for (const system of this.systems) system.dispose?.();
    this.systems.length = 0;
  }
}
