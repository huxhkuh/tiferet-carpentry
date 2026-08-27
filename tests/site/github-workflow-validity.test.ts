import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowsDirectory = join(process.cwd(), '.github', 'workflows');

function isActionInputCollection(lines: string[], lineIndex: number, indentation: number): boolean {
  const enclosingLine = lines
    .slice(0, lineIndex)
    .reverse()
    .find((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) return false;
      const candidateIndentation = line.length - line.trimStart().length;
      return candidateIndentation < indentation;
    });

  return enclosingLine?.trim() === 'with:';
}

function findInvalidActionInputs(fileName: string): string[] {
  const lines = readFileSync(join(workflowsDirectory, fileName), 'utf8').split(/\r?\n/);

  return lines.flatMap((line, lineIndex) => {
    const collectionMatch = /^(\s*)[\w-]+:\s*(?:\[[^\n]*\]|\{[^\n]*\})\s*$/.exec(line);
    if (!collectionMatch) return [];

    const indentation = collectionMatch[1]?.length ?? 0;
    if (!isActionInputCollection(lines, lineIndex, indentation)) return [];

    return [`${fileName}:${lineIndex + 1}`];
  });
}

describe('GitHub workflow action inputs', () => {
  it('uses scalar strings for every value nested below with', () => {
    const workflowFiles = readdirSync(workflowsDirectory).filter(
      (fileName) => fileName.endsWith('.yml') || fileName.endsWith('.yaml'),
    );
    const invalidInputs = workflowFiles.flatMap(findInvalidActionInputs);

    expect(invalidInputs, `Non-scalar GitHub Action inputs: ${invalidInputs.join(', ')}`).toEqual([]);
  });
});
