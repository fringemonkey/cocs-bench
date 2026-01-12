/**
 * D1 database utilities
 */

import { Env, BenchmarkRun } from './types';

/**
 * Insert a benchmark run into the database
 */
export async function insertRun(env: Env, run: Partial<BenchmarkRun>): Promise<string> {
  const id = crypto.randomUUID();
  const submitted_at = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO runs (
      id, submitted_at, source, verified,
      avg_fps, low_5_fps, min_fps, max_fps, total_frames, duration,
      upscaler, upscaler_tier, resolution_scale, gi_quality, reflection_quality,
      rt_enabled, window_mode, ocr_confidence, missing_fields, screenshot_url,
      artifact_url, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      submitted_at,
      run.source || 'web',
      run.verified || 0,
      run.avg_fps,
      run.low_5_fps,
      run.min_fps,
      run.max_fps,
      run.total_frames,
      run.duration,
      run.upscaler,
      run.upscaler_tier,
      run.resolution_scale,
      run.gi_quality,
      run.reflection_quality,
      run.rt_enabled ? 1 : 0,
      run.window_mode,
      run.ocr_confidence || null,
      run.missing_fields || null,
      run.screenshot_url || null,
      run.artifact_url || null,
      run.notes || null
    )
    .run();

  return id;
}

/**
 * Get a benchmark run by ID
 */
export async function getRun(env: Env, id: string): Promise<BenchmarkRun | null> {
  const result = await env.DB.prepare('SELECT * FROM runs WHERE id = ?')
    .bind(id)
    .first<BenchmarkRun>();

  return result || null;
}

/**
 * List benchmark runs
 */
export async function listRuns(env: Env, limit = 100, offset = 0): Promise<BenchmarkRun[]> {
  const result = await env.DB.prepare('SELECT * FROM runs ORDER BY submitted_at DESC LIMIT ? OFFSET ?')
    .bind(limit, offset)
    .all<BenchmarkRun>();

  return result.results || [];
}
