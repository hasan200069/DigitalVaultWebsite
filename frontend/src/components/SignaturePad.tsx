import React, { useRef, useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onClose: () => void;
  initialSignature?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClose, initialSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureValid, setSignatureValid] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(initialSignature || null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    // Set drawing properties
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Fill with white background to ensure detection works
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load initial signature if provided
    if (initialSignature && signatureMode === 'draw') {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
        setSignatureValid(true); // Initial signature is valid
      };
      img.src = initialSignature;
    }
  }, [initialSignature, signatureMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true); // Mark that drawing has started
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Immediately validate signature as user draws
    if (!signatureValid) {
      setSignatureValid(true);
    }
  };

  const checkCanvasForSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if there are any non-white/non-transparent pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // If pixel is not white (255,255,255) and has alpha
      if (a > 0 && (r < 255 || g < 255 || b < 255)) {
        return true;
      }
    }
    
    return false;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    // Check for signature after drawing stops
    setTimeout(() => {
      if (signatureMode === 'draw') {
        const hasContent = checkCanvasForSignature();
        setSignatureValid(hasContent);
      }
    }, 10);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setUploadedImage(null);
    setTypedSignature('');
    setHasDrawn(false); // Reset drawing flag
    setSignatureValid(false); // Reset validation
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setUploadedImage(imageData);
      
      // Also draw on canvas
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const aspectRatio = img.width / img.height;
        let drawWidth = canvas.width;
        let drawHeight = canvas.width / aspectRatio;
        
        if (drawHeight > canvas.height) {
          drawHeight = canvas.height;
          drawWidth = canvas.height * aspectRatio;
        }
        
        ctx.drawImage(img, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
      };
      img.src = imageData;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    let signatureData = '';

    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        signatureData = canvas.toDataURL('image/png');
      }
    } else if (signatureMode === 'type') {
      // Create a canvas with the typed signature
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 400;
        canvas.height = 150;
        ctx.font = '48px Brush Script MT, cursive';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedSignature || 'Signature', canvas.width / 2, canvas.height / 2);
        signatureData = canvas.toDataURL('image/png');
      }
    } else if (signatureMode === 'upload' && uploadedImage) {
      signatureData = uploadedImage;
    }

    if (signatureData) {
      onSave(signatureData);
    }
  };

  const hasSignature = () => {
    if (signatureMode === 'draw') {
      // Use the reactive state for validation
      return signatureValid;
    } else if (signatureMode === 'type') {
      return typedSignature.trim().length > 0;
    } else {
      return uploadedImage !== null;
    }
  };
  
  // Update signature validity when typed signature changes
  useEffect(() => {
    if (signatureMode === 'type') {
      setSignatureValid(typedSignature.trim().length > 0);
    } else if (signatureMode === 'upload') {
      setSignatureValid(uploadedImage !== null);
    } else if (signatureMode === 'draw' && hasDrawn) {
      // Re-check canvas when mode changes to draw
      const isValid = checkCanvasForSignature();
      setSignatureValid(isValid);
    }
  }, [typedSignature, uploadedImage, signatureMode, hasDrawn]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Your Signature</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Mode Selector */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => {
                setSignatureMode('draw');
                setHasDrawn(false);
                setSignatureValid(false); // Reset validation when switching
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                signatureMode === 'draw'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Draw
            </button>
            <button
              onClick={() => {
                setSignatureMode('type');
                setHasDrawn(false);
                setSignatureValid(false); // Reset validation when switching
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                signatureMode === 'type'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Type
            </button>
            <button
              onClick={() => {
                setSignatureMode('upload');
                setHasDrawn(false);
                setSignatureValid(false); // Reset validation when switching
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                signatureMode === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upload Image
            </button>
          </div>

          {/* Draw Mode */}
          {signatureMode === 'draw' && (
            <div className="space-y-4">
              <div className="border-2 border-gray-300 rounded-lg bg-white" style={{ height: '300px' }}>
                <canvas
                  ref={canvasRef}
                  className="w-full h-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-sm text-gray-500 text-center">
                Draw your signature above using your mouse or touch screen
              </p>
            </div>
          )}

          {/* Type Mode */}
          {signatureMode === 'type' && (
            <div className="space-y-4">
              <div className="border-2 border-gray-300 rounded-lg bg-white p-8 flex items-center justify-center" style={{ minHeight: '200px' }}>
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Type your signature here"
                  className="w-full text-center text-5xl border-none outline-none"
                  style={{
                    fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
                    color: '#000000',
                    background: 'transparent'
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 text-center">
                Type your name to create a typed signature
              </p>
            </div>
          )}

          {/* Upload Mode */}
          {signatureMode === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                {uploadedImage ? (
                  <div className="space-y-4">
                    <img
                      src={uploadedImage}
                      alt="Signature"
                      className="max-h-48 mx-auto"
                    />
                    <button
                      onClick={clearCanvas}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="signature-upload"
                    />
                    <label
                      htmlFor="signature-upload"
                      className="cursor-pointer inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upload Signature Image
                    </label>
                    <p className="mt-4 text-sm text-gray-500">
                      Upload a PNG, JPG, or other image file of your signature
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={clearCanvas}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <TrashIcon className="h-5 w-5" />
              <span>Clear</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasSignature()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                hasSignature()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <CheckIcon className="h-5 w-5" />
              <span>Save Signature</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;

