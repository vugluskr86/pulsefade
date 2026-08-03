import { MODES, MODE_ORDER, type ModeId } from '../config/modes';

export interface StatItem {
  label: string;
  value: string;
  hot?: boolean;
}

export interface ActionItem {
  id: string;
  label: string;
  hint?: string;
  primary?: boolean;
}

export interface PanelSpec {
  eyebrow: string;
  title: string;
  note?: string;
  stats?: StatItem[];
  duel?: { left: { name: string; score: number }; right: { name: string; score: number } };
  actions: ActionItem[];
}

/** Экраны поверх поля: результаты, выбор режима, антракт дуэли. */
export class Overlay {
  private handler: ((id: string) => void) | null = null;

  constructor(private readonly root: HTMLElement) {
    this.root.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!button) return;
      this.handler?.(button.dataset.action as string);
    });
  }

  onAction(handler: (id: string) => void): void {
    this.handler = handler;
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  hide(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  show(spec: PanelSpec): void {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('header');
    const eyebrow = document.createElement('div');
    eyebrow.className = 'panel__eyebrow';
    eyebrow.textContent = spec.eyebrow;
    const title = document.createElement('h1');
    title.className = 'panel__title';
    title.textContent = spec.title;
    header.append(eyebrow, title);
    if (spec.note) {
      const note = document.createElement('p');
      note.className = 'panel__note';
      note.textContent = spec.note;
      header.append(note);
    }
    fragment.append(header);

    if (spec.duel) {
      fragment.append(this.buildDuel(spec.duel));
    }

    if (spec.stats?.length) {
      const list = document.createElement('dl');
      list.className = 'stats';
      for (const stat of spec.stats) {
        const cell = document.createElement('div');
        const term = document.createElement('dt');
        term.textContent = stat.label;
        const value = document.createElement('dd');
        value.textContent = stat.value;
        if (stat.hot) value.className = 'hot';
        cell.append(term, value);
        list.append(cell);
      }
      fragment.append(list);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    for (const action of spec.actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.primary ? 'btn btn--primary' : 'btn';
      button.dataset.action = action.id;
      button.append(document.createTextNode(action.label));
      if (action.hint) {
        const hint = document.createElement('small');
        hint.textContent = action.hint;
        button.append(hint);
      }
      actions.append(button);
    }
    fragment.append(actions);

    this.root.replaceChildren(fragment);
    this.root.hidden = false;
  }

  showModes(current: ModeId, extraActions: readonly ActionItem[] = []): void {
    this.show({
      eyebrow: 'режимы',
      title: 'Выбор режима',
      note: 'Последовательность паттернов зависит от seed — в Duel она одинакова для обоих игроков.',
      actions: [
        ...MODE_ORDER.map((id) => ({
          id: `mode:${id}`,
          label: MODES[id].title + (id === current ? ' ·' : ''),
          hint: MODES[id].subtitle,
        })),
        ...extraActions,
        { id: 'debug', label: 'Настройка окон', hint: 'Правка баланса на лету' },
        { id: 'close', label: 'Назад' },
      ],
    });
  }

  private buildDuel(duel: NonNullable<PanelSpec['duel']>): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'duel';
    const left = this.buildDuelSide(duel.left, duel.left.score >= duel.right.score);
    const vs = document.createElement('div');
    vs.className = 'duel__vs';
    vs.textContent = 'VS';
    const right = this.buildDuelSide(duel.right, duel.right.score >= duel.left.score);
    wrap.append(left, vs, right);
    return wrap;
  }

  private buildDuelSide(side: { name: string; score: number }, winner: boolean): HTMLElement {
    const element = document.createElement('div');
    element.className = 'duel__side';
    if (winner) element.dataset.win = '1';
    const name = document.createElement('div');
    name.textContent = side.name;
    const score = document.createElement('div');
    score.className = 'duel__score';
    score.textContent = String(side.score);
    element.append(name, score);
    return element;
  }
}
