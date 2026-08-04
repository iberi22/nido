import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Bundle Code-Splitting Configuration', () => {
  it('should have vite.config.ts containing all required manualChunks vendor keys', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    const content = fs.readFileSync(configPath, 'utf8');

    expect(content).toContain('vendor-three');
    expect(content).toContain('vendor-mesh');
    expect(content).toContain('vendor-swal');
    expect(content).toContain('manualChunks');
  });

  it('should have the analyze-bundle.sh script in scripts directory with correct shebang', () => {
    const scriptPath = path.resolve(__dirname, '../../scripts/analyze-bundle.sh');
    const exists = fs.existsSync(scriptPath);
    expect(exists).toEqual(true);

    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content.startsWith('#!')).toEqual(true);
    expect(content).toContain('npm run build');
    expect(content).toContain('ls -lhS');
  });

  it('should have executable permissions on scripts/analyze-bundle.sh', () => {
    const scriptPath = path.resolve(__dirname, '../../scripts/analyze-bundle.sh');
    const stats = fs.statSync(scriptPath);
    // On Unix-like systems, check if the executable bit is set
    const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0;
    expect(isExecutable).not.toBeFalsy();
  });
});
