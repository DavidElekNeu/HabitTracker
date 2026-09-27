import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// The document is content input only; prose outside its table is not executed.
const input = process.argv[2];
if (!input) throw new Error('Pass the lessons Markdown file path.');
const lessons = readFileSync(input, 'utf8').split(/\r?\n/)
  .filter(line => /^\|\s*\d+\s*\|/.test(line))
  .map(line => {
    const [, day, heading, body, source] = line.split('|').map(value => value.trim());
    const title = /^\*\*(.+?)\*\*\s*·\s*(.+)$/.exec(heading);
    const link = /^\[(.+)\]\((https:\/\/.+)\)$/.exec(source);
    if (!title || !link) throw new Error(`Invalid lesson ${day}`);
    return { day: Number(day), title: title[1], topic: title[2], body,
      sourceLabel: link[1], sourceUrl: link[2] };
  });
if (lessons.length !== 120 || lessons.some((lesson, index) => lesson.day !== index + 1)) {
  throw new Error('Expected 120 consecutive lessons.');
}
mkdirSync('src/assets', { recursive: true });
writeFileSync('src/assets/daily-lessons.json', JSON.stringify(lessons, null, 2) + '\n');
writeFileSync('src/app/core/constants/daily-motivation-messages.ts',
  '// Imported from elet-cel-ido-napi-tanulsagok.md; preserve the supplied order and attribution.\n' +
  'import lessons from "../../../assets/daily-lessons.json";\n\n' +
  'export const DAILY_LESSONS = lessons;\n' +
  'export const DAILY_MOTIVATION_MESSAGES: readonly string[] = lessons.map(lesson => lesson.body);\n');
console.log(`Imported ${lessons.length} lessons.`);
