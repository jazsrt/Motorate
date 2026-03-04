export const haptics = {
  light: () => navigator.vibrate?.([25]),
  medium: () => navigator.vibrate?.([15, 50, 25]),
  heavy: () => navigator.vibrate?.([15, 50, 25, 100, 50, 50, 25]),
  celebration: () => navigator.vibrate?.([15, 50, 25, 50, 40]),
};
