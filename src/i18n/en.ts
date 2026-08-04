import { registerLocale } from './locale';

registerLocale('en', {
  // ── Modes ──
  'mode.adaptive': 'Adaptive',
  'mode.adaptive.desc': 'Standard shifting tempo',
  'mode.chaos': 'Chaos',
  'mode.chaos.desc': 'Sharp but telegraphed changes',
  'mode.marathon': 'Marathon',
  'mode.marathon.desc': 'Constantly accelerating, three misses — game over',
  'mode.zen': 'Zen',
  'mode.zen.desc': 'No failure, accuracy only',
  'mode.duel': 'Duel',
  'mode.duel.desc': 'Same pattern sequence for both players',
  'mode.daily': 'Daily',
  'mode.daily.desc': 'Same daily sequence for everyone',

  // ── HUD ──
  'hud.score': 'score',
  'hud.combo': 'combo',
  'hud.multiplier': 'multiplier',

  // ── Result ──
  'result.time': 'Round complete',
  'result.fail': 'Three misses',
  'result.stopped': 'Stopped',
  'result.replayFinished': 'Replay finished',
  'result.score': 'score',
  'result.bestCombo': 'best combo',
  'result.perfect': 'perfect',
  'result.misses': 'misses',
  'result.perfectRatio': 'perfect',
  'result.pulses': 'pulses',
  'result.again': 'Again',
  'result.againHint': 'space or tap',
  'result.replay': 'Replay best streak',
  'result.replayHint': '{streak} hits in a row',
  'result.modes': 'Modes',
  'result.leaderboard': 'Leaderboard',
  'result.leaderboardHint': 'best Adaptive scores',
  'result.rewardedNote': 'Double your earned pulses by watching an ad.',
  'result.rewardedBtn': '×2 PULSES · AD',
  'result.rewardedHint': '+{reward} more',

  // ── Rewarded states ──
  'rewarded.loading': 'Loading ad...',
  'rewarded.nofill': 'No ad available right now',
  'rewarded.cancel': 'Ad skipped',
  'rewarded.granted': 'Reward doubled: +{reward} pulses',
  'rewarded.syncFail': 'Sync temporarily unavailable',

  // ── Pause ──
  'pause.title': 'Resume round',
  'pause.note': 'Timer, pulses and input were paused while the tab was inactive.',
  'pause.resume': 'Resume',
  'pause.resumeHint': 'space or tap',

  // ── Duel ──
  'duel.round1': 'duel · 1 / 2',
  'duel.player2': 'Player 2, your turn',
  'duel.note': 'The pattern sequence is the same — only execution is compared.',
  'duel.start': 'Start',
  'duel.result': 'duel · result',
  'duel.win1': 'Player 1 wins',
  'duel.win2': 'Player 2 wins',
  'duel.draw': 'Draw',
  'duel.player1': 'Player 1',
  'duel.again': 'Again',
  'duel.againHint': 'new seed',

  // ── Journey ──
  'journey.title': 'journey',
  'journey.trials': 'Trials ({completed}/{total})',
  'journey.playNext': 'Play next',
  'journey.result.title': 'trial {id}',
  'journey.newRecord': '{icon} New record: {medal}!',
  'journey.retry': 'Try again to earn a medal.',
  'journey.again': 'Again',
  'journey.againHint': 'improve result',
  'journey.next': 'Next → #{id}',
  'journey.all': 'All trials',
  'journey.none': 'Not passed',
  'journey.medal.score': 'score',
  'journey.medal.perfect': 'perfect',
  'journey.medal.label': 'medal',
  'journey.menuLabel': 'Journey Trials',
  'journey.menuHint': '{completed}/{total} completed',

  // ── Daily ──
  'daily.title': 'daily',
  'daily.heading': 'Daily trial',
  'daily.done': 'Daily trial complete.',
  'daily.firstReward': ' First attempt bonus: +{reward} pulses.',
  'daily.best': ' Best result today: {score}. Daily reward already claimed.',
  'daily.improved': ' Daily record improved: +{bonus} pulses.',
  'daily.record': ' Daily record: {score}. Daily reward already claimed.',
  'daily.bestLabel': 'daily record',

  // ── Missions ──
  'missions.title': 'missions',
  'missions.heading': 'Missions ({completed}/{total})',
  'missions.claim': 'Claim reward (+{reward} pulses)',
  'missions.done': '✓ claimed',
  'missions.waiting': 'reward ready',
  'missions.completeNote':
    '🎯 Mission complete: {names}. +{reward} pulses. Reward awaits in missions.',
  'missions.receivedNote': 'Mission rewards claimed: +{total} pulses.',

  // ── Shop ──
  'shop.title': 'shop',
  'shop.heading': 'Cosmetics · {balance} pulses',
  'shop.category.palettes': 'Palettes',
  'shop.category.particles': 'Particles',
  'shop.category.sound': 'Sound',
  'shop.selected': 'selected',
  'shop.use': 'use',
  'shop.bought': 'owned',

  // ── Misc ──
  'menu.modes': 'Mode select',
  'menu.modesNote': 'Pattern sequence depends on seed — in Duel it is identical for both players.',
  'menu.back': 'Back',
  'menu.debug': 'Tuning',
  'menu.debugHint': 'Live balance tweaks',
  'menu.shop': 'Shop',
  'menu.missions': 'Missions',

  // ── Journey Trials ──
  'journey.1.title': 'First Pulse',
  'journey.1.desc': 'Steady rhythm, wide PERFECT window. Feel the beat.',
  'journey.2.title': 'Acceleration',
  'journey.2.desc': 'Gradual tempo increase. Watch the ring speed.',
  'journey.3.title': 'Pause',
  'journey.3.desc': 'Slowdowns and sudden pauses. Trust the ring color.',
  'journey.4.title': 'Double Beat',
  'journey.4.desc': 'Twin pulses. Get ready to tap twice.',
  'journey.5.title': 'Streak',
  'journey.5.desc': 'Hold combo for ×2 multiplier. MISS resets progress.',
  'journey.6.title': 'Tempo Shift',
  'journey.6.desc': "Sharp transitions from fast to slow. Don't break the streak.",
  'journey.7.title': 'Cascade',
  'journey.7.desc': 'Combined accelerations. Keep rhythm in rapid pattern changes.',
  'journey.8.title': 'Endurance',
  'journey.8.desc': 'Long pauses between streaks. Stay focused.',
  'journey.9.title': 'Double Tempo',
  'journey.9.desc': 'Double-beat and accelerations together. Reaction at the limit.',
  'journey.10.title': 'Deception',
  'journey.10.desc': "Fake slowdowns and unexpected speed-ups. Don't be fooled.",
  'journey.11.title': 'Choice',
  'journey.11.desc': 'Two centers and slowdowns. Choose a side and hit the rhythm.',
  'journey.12.title': 'Final',
  'journey.12.desc': 'All pattern types and events. Your ultimate trial.',

  // ── Mission Definitions ──
  'missions.perfect_25.title': 'Sharpshooter',
  'missions.perfect_25.desc': 'Get 25 PERFECT hits',
  'missions.combo_20.title': 'On a Roll',
  'missions.combo_20.desc': 'Hold a combo of 20',
  'missions.flawless.title': 'Flawless',
  'missions.flawless.desc': 'Complete a round without a MISS',
  'missions.modes_3.title': 'Variety',
  'missions.modes_3.desc': 'Play 3 different modes',
  'missions.beat_record.title': 'Outdo Yourself',
  'missions.beat_record.desc': 'Beat your personal record',
  'missions.replay_watch.title': 'Film Buff',
  'missions.replay_watch.desc': 'Watch a replay of your best streak',
  'missions.rounds_5.title': 'Marathoner',
  'missions.rounds_5.desc': 'Complete 5 rounds',

  // ── Cosmetics ──
  'cosmetic.palette_default.title': 'Standard',
  'cosmetic.palette_default.desc': 'Default blue-violet palette',
  'cosmetic.palette_fire.title': 'Fire',
  'cosmetic.palette_fire.desc': 'Orange-red tones',
  'cosmetic.palette_ice.title': 'Ice',
  'cosmetic.palette_ice.desc': 'Cool blue-white tones',
  'cosmetic.palette_toxic.title': 'Toxin',
  'cosmetic.palette_toxic.desc': 'Green-yellow acidic tones',
  'cosmetic.palette_night.title': 'Night',
  'cosmetic.palette_night.desc': 'Deep dark-blue tones',
  'cosmetic.palette_neon.title': 'Neon',
  'cosmetic.palette_neon.desc': 'Pink-cyan bright tones',
  'cosmetic.particles_default.title': 'Pulses',
  'cosmetic.particles_default.desc': 'Default particles',
  'cosmetic.particles_spark.title': 'Sparks',
  'cosmetic.particles_spark.desc': 'Bright sparks on hit',
  'cosmetic.particles_rings.title': 'Rings',
  'cosmetic.particles_rings.desc': 'Expanding rings on PERFECT',
  'cosmetic.particles_void.title': 'Void',
  'cosmetic.particles_void.desc': 'Dark particles with violet glow',
  'cosmetic.sound_default.title': 'Clicks',
  'cosmetic.sound_default.desc': 'Default synthesized clicks',
  'cosmetic.sound_chime.title': 'Chimes',
  'cosmetic.sound_chime.desc': 'Melodic chimes',
  'cosmetic.sound_techno.title': 'Techno',
  'cosmetic.sound_techno.desc': 'Electronic rhythmic clicks',

  // ── Result stats ──
  'stats.score': 'score',
  'stats.bestCombo': 'best combo',
  'stats.perfect': 'perfect',
  'stats.misses': 'misses',
  'stats.pulses': 'pulses',
  'stats.bestRecord': 'daily record',

  // ── Result extras ──
  'result.rewardedGranted': 'Reward doubled: +{reward} pulses for this round.',
  'result.rewardedFail': 'Ad unavailable or skipped. Base reward is already saved.',
  'result.rewardedSyncNote': 'Double your earned pulses by watching an ad.',

  // ── System ──
  'sys.error.webgl': 'WebGL2 required',
  'sys.error.startup': 'startup error',
  'sys.error.markup': 'Page layout is corrupted',

  // ── Duel stats ──
  'duel.stats.series': 'streak · {player}',
  'duel.stats.perfect': 'perfect · {player}',
  'duel.stats.score': 'score',
  'duel.stats.bestCombo': 'best combo',
  'duel.stats.perfectRatio': 'perfect',
  'duel.stats.misses': 'misses',
  'duel.back': 'Modes',
  'duel.replay': 'Replay best streak',
  'duel.leaderboard': 'Leaderboard',
  'duel.leaderboardHint': 'best Adaptive scores',
  'duel.modes': 'Modes',

  // ── Medals ──
  'medal.bronze': 'Bronze',
  'medal.silver': 'Silver',
  'medal.gold': 'Gold',

  // ── Menu ──
  'menu.eyebrow': 'modes',

  // ── Stats ──
  'stats.eyebrow': 'statistics',
  'stats.title': 'Statistics',
  'stats.hint': 'Journey, missions, cosmetics',

  // ── Pause ──
  'pause.eyebrow': 'paused',
});
