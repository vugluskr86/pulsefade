import { MODES, MODE_ORDER, type ModeId } from '../config/modes';
import { JOURNEY_TRIALS, type Medal, type JourneyState } from '../config/journey';
import { WEEKLY_MISSIONS, type MissionsState } from '../config/missions';
import { ALL_COSMETICS, type CosmeticState, type CosmeticItem } from '../config/cosmetics';

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

  /** Экран выбора испытаний Journey. */
  showJourneyTrials(state: JourneyState): void {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('header');
    const eyebrow = document.createElement('div');
    eyebrow.className = 'panel__eyebrow';
    eyebrow.textContent = 'journey';
    const title = document.createElement('h1');
    title.className = 'panel__title';
    const completed = state.trials.filter((t) => t.bestMedal !== 'none').length;
    title.textContent = `Испытания (${completed}/${JOURNEY_TRIALS.length})`;
    header.append(eyebrow, title);
    fragment.append(header);

    const grid = document.createElement('div');
    grid.className = 'journey-grid';
    for (let i = 0; i < JOURNEY_TRIALS.length; i++) {
      const trial = JOURNEY_TRIALS[i];
      const progress = state.trials[i];
      const unlocked = i <= state.currentIndex;

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'journey-trial';
      cell.dataset.action = unlocked ? `journey:${trial.id}` : '';
      if (!unlocked) cell.disabled = true;

      const num = document.createElement('span');
      num.className = 'journey-trial__num';
      num.textContent = String(trial.id);

      const name = document.createElement('span');
      name.className = 'journey-trial__name';
      name.textContent = unlocked ? trial.title : '???';

      const medalIcon = this.medalIcon(progress.bestMedal);
      if (medalIcon) {
        const medal = document.createElement('span');
        medal.className = `journey-trial__medal journey-trial__medal--${progress.bestMedal}`;
        medal.textContent = medalIcon;
        cell.append(medal);
      }

      cell.append(num, name);
      grid.append(cell);
    }
    fragment.append(grid);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const nextTrial = JOURNEY_TRIALS[state.currentIndex];
    if (nextTrial) {
      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'btn btn--primary';
      playBtn.dataset.action = `journey:${nextTrial.id}`;
      playBtn.textContent = 'Играть следующее';
      const hint = document.createElement('small');
      hint.textContent = `#${nextTrial.id} · ${nextTrial.title}`;
      playBtn.append(hint);
      actions.append(playBtn);
    }

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn';
    backBtn.dataset.action = 'modes';
    backBtn.textContent = 'Режимы';
    actions.append(backBtn);

    fragment.append(actions);
    this.root.replaceChildren(fragment);
    this.root.hidden = false;
  }

  /** Экран результата испытания Journey с медалью. */
  showJourneyResult(
    trialId: number,
    medal: Medal,
    score: number,
    perfectRatio: number,
    bestMedal: Medal,
    actions: ActionItem[],
  ): void {
    const trial = JOURNEY_TRIALS[trialId - 1];
    const medalLabels: Record<Medal, string> = {
      none: 'Не пройдено',
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
    };
    const medalIcons: Record<Medal, string> = { none: '', bronze: '🥉', silver: '🥈', gold: '🥇' };
    const isNewBest =
      medal !== 'none' &&
      (bestMedal === 'none' ||
        { none: 0, bronze: 1, silver: 2, gold: 3 }[medal] >
          { none: 0, bronze: 1, silver: 2, gold: 3 }[bestMedal]);

    this.show({
      eyebrow: `испытание ${trialId}`,
      title: trial?.title ?? `Испытание ${trialId}`,
      note: isNewBest
        ? `${medalIcons[medal]} Новый рекорд: ${medalLabels[medal]}!`
        : medal !== 'none'
          ? `${medalIcons[medal]} ${medalLabels[medal]}`
          : 'Попробуй ещё раз, чтобы получить медаль.',
      stats: [
        { label: 'score', value: String(score), hot: true },
        { label: 'perfect', value: `${Math.round(perfectRatio * 100)}%` },
        {
          label: 'медаль',
          value: `${medalIcons[medal]} ${medalLabels[medal]}`,
          hot: medal !== 'none',
        },
      ],
      actions,
    });
  }

  private medalIcon(medal: Medal): string | null {
    switch (medal) {
      case 'gold':
        return '🥇';
      case 'silver':
        return '🥈';
      case 'bronze':
        return '🥉';
      default:
        return null;
    }
  }

  showMissions(state: MissionsState, pendingReward: number): void {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('header');
    const eyebrow = document.createElement('div');
    eyebrow.className = 'panel__eyebrow';
    eyebrow.textContent = 'миссии';
    const title = document.createElement('h1');
    title.className = 'panel__title';
    const completed = state.progress.filter((p) => p.completed).length;
    title.textContent = `Миссии (${completed}/${WEEKLY_MISSIONS.length})`;
    header.append(eyebrow, title);
    fragment.append(header);

    const list = document.createElement('div');
    for (const def of WEEKLY_MISSIONS) {
      const progress = state.progress.find((p) => p.missionId === def.id);
      if (!progress) continue;

      const item = document.createElement('div');
      item.style.cssText =
        'border:1px solid var(--hair); padding:10px 12px; margin-bottom:6px; border-radius:2px;';

      const name = document.createElement('div');
      name.style.cssText =
        'font-family:var(--mono); font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--chalk);';
      name.textContent = def.title;

      const desc = document.createElement('div');
      desc.style.cssText = 'font-size:10px; color:var(--muted); margin-top:2px;';
      desc.textContent = `${def.description} · +${def.reward} pulses`;

      const bar = document.createElement('div');
      bar.style.cssText = 'height:3px; background:var(--hair); margin-top:6px; border-radius:1px;';
      const fill = document.createElement('div');
      const pct = Math.min(100, Math.round((progress.current / def.target) * 100));
      fill.style.cssText = `height:100%; width:${pct}%; background:${progress.completed ? 'var(--mint)' : 'var(--ember)'}; border-radius:1px; transition:width 0.3s ease;`;
      bar.append(fill);

      const meta = document.createElement('div');
      meta.style.cssText =
        'font-family:var(--mono); font-size:9px; color:var(--muted); margin-top:4px; display:flex; justify-content:space-between;';
      const count = document.createElement('span');
      count.textContent = `${progress.current}/${def.target}`;
      const status = document.createElement('span');
      status.textContent = progress.completed
        ? progress.rewardClaimed
          ? '✓ получено'
          : 'награда ждёт'
        : '';
      meta.append(count, status);

      item.append(name, desc, bar, meta);
      list.append(item);
    }
    fragment.append(list);

    const actions = document.createElement('div');
    actions.className = 'actions';
    if (pendingReward > 0) {
      const claimBtn = document.createElement('button');
      claimBtn.type = 'button';
      claimBtn.className = 'btn btn--primary';
      claimBtn.dataset.action = 'claim-missions';
      claimBtn.textContent = `Забрать награду (+${pendingReward} pulses)`;
      actions.append(claimBtn);
    }
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn';
    backBtn.dataset.action = 'modes';
    backBtn.textContent = 'Режимы';
    actions.append(backBtn);

    fragment.append(actions);
    this.root.replaceChildren(fragment);
    this.root.hidden = false;
  }

  showCosmetics(state: CosmeticState, balance: number): void {
    const categories: { title: string; items: readonly CosmeticItem[] }[] = [
      { title: 'Палитры', items: ALL_COSMETICS.filter((c) => c.category === 'palette') },
      { title: 'Частицы', items: ALL_COSMETICS.filter((c) => c.category === 'particles') },
      { title: 'Звук', items: ALL_COSMETICS.filter((c) => c.category === 'sound') },
    ];

    const fragment = document.createDocumentFragment();
    const header = document.createElement('header');
    const eyebrow = document.createElement('div');
    eyebrow.className = 'panel__eyebrow';
    eyebrow.textContent = 'магазин';
    const title = document.createElement('h1');
    title.className = 'panel__title';
    title.textContent = `Косметика · ${balance} pulses`;
    header.append(eyebrow, title);
    fragment.append(header);

    for (const cat of categories) {
      const section = document.createElement('div');
      section.style.marginBottom = '12px';
      const sub = document.createElement('div');
      sub.style.cssText =
        'font-family:var(--mono); font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); margin-bottom:6px;';
      sub.textContent = cat.title;
      section.append(sub);

      for (const item of cat.items) {
        const owned = state.owned.includes(item.id);
        const selected = state.selected[item.category] === item.id;
        const affordable = !owned && balance >= item.price;

        const row = document.createElement('div');
        row.style.cssText =
          'display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--hair);';

        const info = document.createElement('div');
        info.style.flex = '1';
        const itemName = document.createElement('div');
        itemName.style.cssText =
          'font-family:var(--mono); font-size:10px; letter-spacing:0.1em; color:var(--chalk);';
        itemName.textContent = item.title + (selected ? ' ·' : '');
        const itemDesc = document.createElement('div');
        itemDesc.style.cssText = 'font-size:9px; color:var(--muted);';
        itemDesc.textContent = item.description;
        info.append(itemName, itemDesc);

        const action = document.createElement('button');
        action.type = 'button';
        action.className = owned ? 'btn' : 'btn btn--primary';
        action.style.cssText =
          'padding:6px 12px; font-size:10px; min-width:70px; text-align:center;';
        if (owned) {
          action.textContent = selected ? 'выбрано' : 'исп.';
          if (!selected) action.dataset.action = `cosmetic:${item.id}`;
          else action.disabled = true;
        } else {
          action.textContent = affordable ? `${item.price}` : '—';
          if (affordable) action.dataset.action = `cosmetic:${item.id}`;
          else action.style.opacity = '0.4';
        }

        row.append(info, action);
        section.append(row);
      }
      fragment.append(section);
    }

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn';
    backBtn.dataset.action = 'modes';
    backBtn.textContent = 'Режимы';
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(backBtn);
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
