import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const androidDir = path.join(repoRoot, 'android');
const isWindows = process.platform === 'win32';

const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const gradleCommand = isWindows ? 'gradlew.bat' : './gradlew';
const javaExecutable = isWindows ? 'java.exe' : 'java';
const defaultJavaHome = isWindows
  ? 'C:\\Program Files\\Android\\Android Studio\\jbr'
  : '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
const javaHomeCandidates = [defaultJavaHome];

function isValidJavaHome(javaHomePath) {
  const javaBinary = path.join(javaHomePath, 'bin', javaExecutable);
  if (!existsSync(javaBinary)) {
    return false;
  }
  // Some broken Android Studio installs contain java.exe but miss lib/jvm.cfg.
  const jvmCfg = path.join(javaHomePath, 'lib', 'jvm.cfg');
  if (existsSync(jvmCfg)) {
    return true;
  }
  const releaseFile = path.join(javaHomePath, 'release');
  return existsSync(releaseFile);
}

if (!process.env.JAVA_HOME) {
  for (const candidate of javaHomeCandidates) {
    if (isValidJavaHome(candidate)) {
      process.env.JAVA_HOME = candidate;
      break;
    }
  }
}

if (process.env.JAVA_HOME) {
  const javaBin = path.join(process.env.JAVA_HOME, 'bin');
  const nextPath = `${javaBin}${path.delimiter}${process.env.PATH ?? ''}`;
  process.env.PATH = nextPath;
  process.env.Path = nextPath;
}

if (!process.env.GRADLE_USER_HOME) {
  process.env.GRADLE_USER_HOME = path.join(androidDir, '.gradle-user-home');
}
mkdirSync(process.env.GRADLE_USER_HOME, { recursive: true });

const steps = [
  { command: npmCommand, args: ['run', 'android:web:debug'], cwd: repoRoot },
  { command: npmCommand, args: ['run', 'android:sync'], cwd: repoRoot },
  { command: gradleCommand, args: ['assembleDebug'], cwd: androidDir }
];

for (const step of steps) {
  const label = `${step.command} ${step.args.join(' ')}`;
  console.log(`\n> ${label}`);
  const result = spawnSync(step.command, step.args, {
    cwd: step.cwd,
    env: process.env,
    stdio: 'inherit',
    shell: isWindows
  });

  if (result.error) {
    console.error(`\nFailed to run: ${label}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
console.log(`\nDebug APK ready: ${apkPath}`);
