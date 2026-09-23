import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { atomicWriteJson, loadJsonSafe } from '../lib/fs-utils.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsutils-test-'));
});

describe('atomicWriteJson', () => {
  it('writes JSON atomically', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    await atomicWriteJson(filePath, { key: 'value' });

    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    expect(content.key).toBe('value');
  });

  it('overwrites existing file', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    await atomicWriteJson(filePath, { version: 1 });
    await atomicWriteJson(filePath, { version: 2 });

    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    expect(content.version).toBe(2);
  });

  it('does not leave .tmp file on success', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    await atomicWriteJson(filePath, { data: true });

    const files = await fs.readdir(tmpDir);
    expect(files).toEqual(['test.json']);
  });

  it('formats JSON with 2-space indent + trailing newline', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    await atomicWriteJson(filePath, { a: 1 });

    const raw = await fs.readFile(filePath, 'utf-8');
    expect(raw).toBe('{\n  "a": 1\n}\n');
  });
});

describe('loadJsonSafe', () => {
  it('loads existing JSON file', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    await fs.writeFile(filePath, '{"key": "value"}');

    const data = await loadJsonSafe(filePath, {});
    expect(data.key).toBe('value');
  });

  it('returns fallback for missing file', async () => {
    const filePath = path.join(tmpDir, 'nonexistent.json');
    const data = await loadJsonSafe(filePath, { default: true });
    expect(data.default).toBe(true);
  });

  it('returns fallback for empty file', async () => {
    const filePath = path.join(tmpDir, 'empty.json');
    await fs.writeFile(filePath, '');

    const data = await loadJsonSafe(filePath, { fallback: true });
    expect(data.fallback).toBe(true);
  });
});
