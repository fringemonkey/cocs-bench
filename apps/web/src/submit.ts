/**
 * Submission utilities for sending benchmark data to the API
 */

export interface BenchmarkSubmission {
  avg_fps?: number;
  low_5_fps?: number;
  min_fps?: number;
  max_fps?: number;
  total_frames?: number;
  duration?: string;
  upscaler?: string;
  upscaler_tier?: string;
  resolution_scale?: number;
  gi_quality?: string;
  reflection_quality?: string;
  rt_enabled?: boolean;
  window_mode?: string;
  screenshot_url?: string;
  artifact_url?: string;
  notes?: string;
}

const API_URL = import.meta.env.PUBLIC_SITE_URL || '';

/**
 * Submit benchmark data to the API with image
 */
export async function submitBenchmark(
  data: BenchmarkSubmission,
  imageFile?: File
): Promise<{ id: string }> {
  const formData = new FormData();
  
  // Add JSON data
  formData.append('data', JSON.stringify(data));
  
  // Add image if provided
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await fetch(`${API_URL}/api/submit`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Submission failed: ${response.statusText} - ${errorText}`);
  }

  return response.json();
}
