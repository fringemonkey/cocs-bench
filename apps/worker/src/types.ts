/**
 * Type definitions for the Cloudflare Worker
 */

export interface Env {
  DB: D1Database;
  NOTION_DATABASE_ID: string;
  NOTION_TOKEN?: string;
}

export interface BenchmarkRun {
  id: string;
  submitted_at: string;
  source: string;
  verified: number;
  
  avg_fps: number;
  low_5_fps: number;
  min_fps: number;
  max_fps: number;
  total_frames: number;
  duration: string;
  
  upscaler: string;
  upscaler_tier: string;
  resolution_scale: number;
  gi_quality: string;
  reflection_quality: string;
  rt_enabled: number;
  window_mode: string;
  
  ocr_confidence: string | null;
  missing_fields: string | null;
  screenshot_url: string | null;
  artifact_url: string | null;
  notes: string | null;
}
