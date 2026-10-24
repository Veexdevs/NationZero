#!/usr/bin/env node
/*
 * Copia os ícones pré-gerados (build/android, build/ios) para os projetos
 * nativos criados pelo Capacitor. Use depois de `npx cap add android|ios`.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
  return true;
};

// ---------- Android ----------
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
if (fs.existsSync(androidRes)) {
  const ok = copyDir(path.join(root, 'build', 'android', 'res'), androidRes);
  console.log(ok ? '✓ Ícones Android aplicados' : '⚠️  Ícones Android não encontrados');
  // ícone da Play Store
  const play = path.join(root, 'build', 'android', 'res', 'ic_launcher-playstore.png');
  if (fs.existsSync(play)) {
    fs.mkdirSync(path.join(root, 'android', 'app', 'src', 'main'), { recursive: true });
    fs.copyFileSync(play, path.join(root, 'android', 'app', 'src', 'main', 'ic_launcher-playstore.png'));
  }
} else {
  console.log('• Projeto Android não encontrado (rode `npx cap add android` primeiro)');
}

// ---------- iOS ----------
const iosPath = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
if (fs.existsSync(path.join(root, 'ios', 'App'))) {
  const ok = copyDir(path.join(root, 'build', 'ios', 'AppIcon.appiconset'), iosPath);
  console.log(ok ? '✓ Ícones iOS aplicados' : '⚠️  Ícones iOS não encontrados');

  // Splash/Launch: usa a mesma arte
  const splashDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
  if (fs.existsSync(splashDir)) {
    const src = path.join(root, 'build', 'icon.png');
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(splashDir, 'splash-2732x2732.png'));
  }
} else {
  console.log('• Projeto iOS não encontrado (rode `npx cap add ios` primeiro)');
}
