/**
 * Cloudflare Worker entry point
 */

import { Env } from './types';
import { insertRun } from './d1';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/submit' && request.method === 'POST') {
      return handleSubmit(request, env, corsHeaders);
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

async function handleSubmit(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let data: any;
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (JSON + image)
      const formData = await request.formData();
      const dataField = formData.get('data');
      const imageField = formData.get('image');

      if (dataField && typeof dataField === 'string') {
        data = JSON.parse(dataField);
      } else {
        return new Response(
          JSON.stringify({ error: 'Missing data field' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (imageField && imageField instanceof File) {
        imageFile = imageField;
      }
    } else {
      // Handle JSON-only request (backward compatibility)
      data = await request.json();
    }

    // Validate required fields
    if (typeof data.avg_fps !== 'number' || 
        typeof data.low_5_fps !== 'number' ||
        typeof data.min_fps !== 'number' ||
        typeof data.max_fps !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing required FPS fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle image storage (for now, we'll store metadata)
    // In production, you'd upload to R2 or another storage service
    let screenshotUrl: string | null = null;
    if (imageFile) {
      // For now, we'll just note that an image was provided
      // In production, upload to R2 and get URL
      screenshotUrl = `image-provided-${crypto.randomUUID()}`;
    }

    // Insert into D1 database
    const run = {
      source: 'web',
      verified: 0,
      avg_fps: data.avg_fps,
      low_5_fps: data.low_5_fps,
      min_fps: data.min_fps,
      max_fps: data.max_fps,
      total_frames: data.total_frames || null,
      duration: data.duration || null,
      upscaler: data.upscaler || null,
      upscaler_tier: data.upscaler_tier || null,
      resolution_scale: data.resolution_scale || null,
      gi_quality: data.gi_quality || null,
      reflection_quality: data.reflection_quality || null,
      rt_enabled: data.rt_enabled ? 1 : 0,
      window_mode: data.window_mode || null,
      ocr_confidence: data.ocr_confidence || null,
      missing_fields: data.missing_fields ? JSON.stringify(data.missing_fields) : null,
      screenshot_url: screenshotUrl,
      artifact_url: data.artifact_url || null,
      notes: data.notes || null,
    };

    const insertedId = await insertRun(env, run);

    return new Response(
      JSON.stringify({ id: insertedId }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Submission error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
