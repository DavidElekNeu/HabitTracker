import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

function walk(dir: string, acc: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

describe('No legacy labels', () => {
  it('does not contain "Last 21 days" in source files', () => {
    const base = join(__dirname);
    const files = walk(base).filter((f) => /\.(ts|tsx|js|jsx|html|css)$/i.test(f) && !/\.test\./.test(f));
    const forbidden = 'Last 21 days';
    const hits: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      if (content.includes(forbidden)) hits.push(f);
    }
    expect(hits, `Forbidden label found in: ${hits.join(', ')}`).toHaveLength(0);
  });
});

