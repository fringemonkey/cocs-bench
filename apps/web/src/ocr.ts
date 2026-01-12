/**
 * OCR utilities for extracting benchmark data from screenshots
 */

import { createWorker } from 'tesseract.js';

export interface OCRResult {
  confidence: string;
  data: Record<string, any>;
  missingFields: string[];
}

export interface BenchmarkData {
  avgFps?: number;
  avgLowFps?: number;
  minFps?: number;
  maxFps?: number;
  totalFrames?: number;
  totalTime?: string;
  upscaler?: string;
  resolutionScale?: number;
  giQuality?: string;
  reflectionQuality?: string;
  rtOn?: boolean;
}

/**
 * Extract numeric value from text using regex
 */
function extractNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (match) {
    const num = parseFloat(match[1] || match[0]);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

/**
 * Extract text value from OCR result
 */
function extractText(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  return match ? match[1]?.trim() : undefined;
}

/**
 * Extract boolean value (RT On/Off)
 */
function extractBoolean(text: string, pattern: RegExp): boolean | undefined {
  const match = text.match(pattern);
  if (match) {
    const value = match[1]?.toLowerCase();
    return value === 'on' || value === 'true' || value === '1';
  }
  return undefined;
}

/**
 * Process an image for OCR extraction
 */
export async function processOCR(imageFile: File | Blob): Promise<OCRResult> {
  const worker = await createWorker('eng');
  
  try {
    const { data } = await worker.recognize(imageFile);
    const text = data.text.toUpperCase();
    const confidence = data.confidence.toString();

    const benchmarkData: BenchmarkData = {};
    const missingFields: string[] = [];

    // Extract AVG FPS
    const avgFps = extractNumber(text, /AVG\s*FPS[:\s]*(\d+\.?\d*)/i) ||
                   extractNumber(text, /AVERAGE\s*FPS[:\s]*(\d+\.?\d*)/i);
    if (avgFps !== undefined) {
      benchmarkData.avgFps = avgFps;
    } else {
      missingFields.push('avgFps');
    }

    // Extract AVG LOW FPS (5%)
    const avgLowFps = extractNumber(text, /AVG\s*LOW\s*FPS[:\s]*\(?5%\)?[:\s]*(\d+\.?\d*)/i) ||
                      extractNumber(text, /LOW\s*5%[:\s]*(\d+\.?\d*)/i);
    if (avgLowFps !== undefined) {
      benchmarkData.avgLowFps = avgLowFps;
    } else {
      missingFields.push('avgLowFps');
    }

    // Extract MIN FPS
    const minFps = extractNumber(text, /MIN\s*FPS[:\s]*(\d+\.?\d*)/i) ||
                   extractNumber(text, /MINIMUM\s*FPS[:\s]*(\d+\.?\d*)/i);
    if (minFps !== undefined) {
      benchmarkData.minFps = minFps;
    } else {
      missingFields.push('minFps');
    }

    // Extract MAX FPS
    const maxFps = extractNumber(text, /MAX\s*FPS[:\s]*(\d+\.?\d*)/i) ||
                   extractNumber(text, /MAXIMUM\s*FPS[:\s]*(\d+\.?\d*)/i);
    if (maxFps !== undefined) {
      benchmarkData.maxFps = maxFps;
    } else {
      missingFields.push('maxFps');
    }

    // Extract TOTAL FRAMES
    const totalFrames = extractNumber(text, /TOTAL\s*FRAMES[:\s]*(\d+)/i);
    if (totalFrames !== undefined) {
      benchmarkData.totalFrames = Math.round(totalFrames);
    } else {
      missingFields.push('totalFrames');
    }

    // Extract TOTAL TIME
    const totalTime = extractText(text, /TOTAL\s*TIME[:\s]*([\d:\.]+)/i);
    if (totalTime) {
      benchmarkData.totalTime = totalTime;
    } else {
      missingFields.push('totalTime');
    }

    // Extract Upscaler
    const upscaler = extractText(text, /UPSCALER[:\s]*([A-Z0-9\s]+)/i);
    if (upscaler) {
      benchmarkData.upscaler = upscaler;
    } else {
      missingFields.push('upscaler');
    }

    // Extract Resolution Scale
    const resolutionScale = extractNumber(text, /RESOLUTION\s*SCALE[:\s]*(\d+\.?\d*)/i) ||
                           extractNumber(text, /RES\s*SCALE[:\s]*(\d+\.?\d*)/i);
    if (resolutionScale !== undefined) {
      benchmarkData.resolutionScale = resolutionScale;
    } else {
      missingFields.push('resolutionScale');
    }

    // Extract GI Quality
    const giQuality = extractText(text, /GI\s*QUALITY[:\s]*([A-Z0-9\s]+)/i);
    if (giQuality) {
      benchmarkData.giQuality = giQuality;
    } else {
      missingFields.push('giQuality');
    }

    // Extract Reflection Quality
    const reflectionQuality = extractText(text, /REFLECTION\s*QUALITY[:\s]*([A-Z0-9\s]+)/i);
    if (reflectionQuality) {
      benchmarkData.reflectionQuality = reflectionQuality;
    } else {
      missingFields.push('reflectionQuality');
    }

    // Extract RT On/Off
    const rtOn = extractBoolean(text, /RT\s*(ON|OFF)/i);
    if (rtOn !== undefined) {
      benchmarkData.rtOn = rtOn;
    } else {
      missingFields.push('rtOn');
    }

    return {
      confidence,
      data: benchmarkData,
      missingFields,
    };
  } finally {
    await worker.terminate();
  }
}
