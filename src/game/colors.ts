import { PALETTE, type Rgba } from '../config/palette';
import type { Telegraph } from '../domain/Beat';
import type { Grade } from '../domain/Judgement';
import type { MutableColor } from './components';

export { PALETTE };

export const copyColorFrom = (color: Rgba, alpha = color[3]): MutableColor => [
  color[0],
  color[1],
  color[2],
  alpha,
];

/** Цвет кольца сообщает характер изменения темпа ещё до удара (GDD §12). */
export const telegraphColor = (telegraph: Telegraph): Rgba => {
  switch (telegraph) {
    case 'faster':
      return PALETTE.ember;
    case 'slower':
    case 'pause':
      return PALETTE.pulse;
    case 'burst':
      return PALETTE.violet;
    default:
      return PALETTE.chalk;
  }
};

export const gradeColor = (grade: Grade): Rgba => {
  switch (grade) {
    case 'perfect':
      return PALETTE.ember;
    case 'great':
      return PALETTE.mint;
    case 'ok':
      return PALETTE.pulse;
    default:
      return PALETTE.rose;
  }
};
