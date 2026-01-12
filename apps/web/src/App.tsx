import React, { useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReactCrop, { Crop, PixelCrop, makeAspectCrop, centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { processOCR, BenchmarkData } from './ocr';
import { submitBenchmark, BenchmarkSubmission } from './submit';
import './styles.css';

function BenchPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCrop, setShowCrop] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<BenchmarkData | null>(null);
  const [formData, setFormData] = useState<BenchmarkData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        16 / 9,
        naturalWidth,
        naturalHeight
      ),
      naturalWidth,
      naturalHeight
    );
    setCrop(crop);
  };

  const getCroppedImage = async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) {
      return imageFile ? await imageFile.arrayBuffer().then(b => new Blob([b])) : null;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const pixelRatio = window.devicePixelRatio;
    canvas.width = completedCrop.width * scaleX * pixelRatio;
    canvas.height = completedCrop.height * scaleY * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;

    ctx.drawImage(
      image,
      cropX,
      cropY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleProcessOCR = async () => {
    if (!imageFile && !imageSrc) return;

    setIsProcessing(true);
    try {
      const croppedBlob = showCrop && completedCrop ? await getCroppedImage() : null;
      const blobToProcess = croppedBlob || (imageFile ? await imageFile.arrayBuffer().then(b => new Blob([b])) : null);
      
      if (!blobToProcess) {
        throw new Error('No image to process');
      }

      const result = await processOCR(blobToProcess);
      setOcrResult(result.data);
      setFormData(result.data);
    } catch (error) {
      console.error('OCR processing failed:', error);
      alert('OCR processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const submission: BenchmarkSubmission = {
        avg_fps: formData.avgFps,
        low_5_fps: formData.avgLowFps,
        min_fps: formData.minFps,
        max_fps: formData.maxFps,
        total_frames: formData.totalFrames,
        duration: formData.totalTime,
        upscaler: formData.upscaler,
        resolution_scale: formData.resolutionScale,
        gi_quality: formData.giQuality,
        reflection_quality: formData.reflectionQuality,
        rt_enabled: formData.rtOn,
      };

      const croppedBlob = showCrop && completedCrop ? await getCroppedImage() : null;
      const imageToSubmit = croppedBlob ? new File([croppedBlob], imageFile?.name || 'cropped.png', { type: 'image/png' }) : imageFile;

      const result = await submitBenchmark(submission, imageToSubmit || undefined);
      setSubmitMessage(`Successfully submitted! ID: ${result.id}`);
      
      // Reset form
      setImageFile(null);
      setImageSrc('');
      setOcrResult(null);
      setFormData({});
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (error) {
      console.error('Submission failed:', error);
      setSubmitMessage(`Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          setImageSrc(reader.result as string);
        });
        reader.readAsDataURL(file);
      }
    }
  };

  const updateFormField = (field: keyof BenchmarkData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bench-page">
      <header>
        <h1>Benchmark Submission</h1>
      </header>
      <main>
        <div className="upload-section">
          <div
            className="drop-zone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageSrc ? (
              <div className="image-preview">
                {showCrop ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={undefined}
                  >
                    <img
                      ref={imgRef}
                      alt="Crop me"
                      src={imageSrc}
                      onLoad={onImageLoad}
                      style={{ maxWidth: '100%', maxHeight: '400px' }}
                    />
                  </ReactCrop>
                ) : (
                  <img
                    src={imageSrc}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '400px' }}
                  />
                )}
                <div className="image-controls">
                  <button onClick={(e) => { e.stopPropagation(); setShowCrop(!showCrop); }}>
                    {showCrop ? 'Disable Crop' : 'Enable Crop'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImageSrc(''); setCrop(undefined); setCompletedCrop(undefined); }}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="drop-zone-content">
                <p>Drag and drop an image here, or click to select</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onSelectFile}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          {imageSrc && (
            <div className="action-buttons">
              <button
                onClick={handleProcessOCR}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing OCR...' : 'Extract Data with OCR'}
              </button>
            </div>
          )}
        </div>

        {ocrResult && (
          <div className="form-section">
            <h2>Benchmark Data</h2>
            <form className="benchmark-form">
              <div className="form-row">
                <label>
                  AVG FPS:
                  <input
                    type="number"
                    step="0.01"
                    value={formData.avgFps ?? ''}
                    onChange={(e) => updateFormField('avgFps', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </label>
                <label>
                  AVG LOW FPS (5%):
                  <input
                    type="number"
                    step="0.01"
                    value={formData.avgLowFps ?? ''}
                    onChange={(e) => updateFormField('avgLowFps', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  MIN FPS:
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minFps ?? ''}
                    onChange={(e) => updateFormField('minFps', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </label>
                <label>
                  MAX FPS:
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxFps ?? ''}
                    onChange={(e) => updateFormField('maxFps', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  TOTAL FRAMES:
                  <input
                    type="number"
                    value={formData.totalFrames ?? ''}
                    onChange={(e) => updateFormField('totalFrames', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </label>
                <label>
                  TOTAL TIME:
                  <input
                    type="text"
                    value={formData.totalTime ?? ''}
                    onChange={(e) => updateFormField('totalTime', e.target.value || undefined)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Upscaler:
                  <input
                    type="text"
                    value={formData.upscaler ?? ''}
                    onChange={(e) => updateFormField('upscaler', e.target.value || undefined)}
                  />
                </label>
                <label>
                  Resolution Scale:
                  <input
                    type="number"
                    step="0.01"
                    value={formData.resolutionScale ?? ''}
                    onChange={(e) => updateFormField('resolutionScale', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  GI Quality:
                  <input
                    type="text"
                    value={formData.giQuality ?? ''}
                    onChange={(e) => updateFormField('giQuality', e.target.value || undefined)}
                  />
                </label>
                <label>
                  Reflection Quality:
                  <input
                    type="text"
                    value={formData.reflectionQuality ?? ''}
                    onChange={(e) => updateFormField('reflectionQuality', e.target.value || undefined)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  RT On:
                  <select
                    value={formData.rtOn === undefined ? '' : formData.rtOn ? 'true' : 'false'}
                    onChange={(e) => updateFormField('rtOn', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
                  >
                    <option value="">Not set</option>
                    <option value="true">On</option>
                    <option value="false">Off</option>
                  </select>
                </label>
              </div>

              <div className="submit-section">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !imageFile}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
                {submitMessage && (
                  <p className={submitMessage.includes('Success') ? 'success' : 'error'}>
                    {submitMessage}
                  </p>
                )}
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/bench" element={<BenchPage />} />
        <Route path="/" element={<Navigate to="/bench" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
