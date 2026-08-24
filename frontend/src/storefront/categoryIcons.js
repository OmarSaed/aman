import {
  Smartphone, Headphones, Watch, Tablet, BatteryCharging, Usb,
  Speaker, Shield, Cpu, HardDrive, Camera, Bluetooth,
  Gamepad, Plug, CreditCard, Sparkles, Package,
} from 'lucide-react';

const ICON_RULES = [
  { test: /phone|mobile|iphone|samsung|huawei|xiaomi|oppo|vivo|android/i, icon: Smartphone },
  { test: /headphone|earbud|airpod|earphone|headset/i, icon: Headphones },
  { test: /watch|band|strap/i, icon: Watch },
  { test: /tablet|ipad/i, icon: Tablet },
  { test: /batter|power.?bank|charge/i, icon: BatteryCharging },
  { test: /cable|wire|usb|type.?c/i, icon: Usb },
  { test: /speaker|sound|audio/i, icon: Speaker },
  { test: /case|cover|protector|glass/i, icon: Shield },
  { test: /chip|cpu|board/i, icon: Cpu },
  { test: /memory|storage|sd|flash/i, icon: HardDrive },
  { test: /camera|lens/i, icon: Camera },
  { test: /bluetooth|wifi|wireless/i, icon: Bluetooth },
  { test: /game|console|play/i, icon: Gamepad },
  { test: /plug|adapter|charger/i, icon: Plug },
  { test: /sim|esim/i, icon: CreditCard },
  { test: /screen|lcd|display/i, icon: Smartphone },
  { test: /accessor/i, icon: Sparkles },
];

const PALETTES = [
  ['#2563eb', '#38bdf8'],
  ['#7c3aed', '#c084fc'],
  ['#0f766e', '#2dd4bf'],
  ['#c2410c', '#fb923c'],
  ['#be185d', '#fb7185'],
  ['#1d4ed8', '#60a5fa'],
  ['#047857', '#34d399'],
  ['#4338ca', '#818cf8'],
];

export function getCategoryStyle(name = '', index = 0) {
  const match = ICON_RULES.find((rule) => rule.test(name));
  const Icon = match?.icon || Package;
  const palette = PALETTES[index % PALETTES.length];
  return { Icon, palette };
}
