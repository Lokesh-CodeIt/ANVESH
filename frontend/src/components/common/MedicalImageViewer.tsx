import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Image as ImageIcon } from 'lucide-react';

interface MedicalImageViewerProps {
  imagePath?: string;
  viewType?: string;
  patientId?: string;
  caseId?: string;
}

export const MedicalImageViewer: React.FC<MedicalImageViewerProps> = ({
  imagePath,
  viewType = 'PA Chest',
  patientId,
  caseId
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Resolve Image URL
  let imageUrl: string | undefined = undefined;
  let isPhantom = false;

  if (imagePath) {
    if (imagePath.startsWith('/demo_dataset') || imagePath.startsWith('http') || imagePath.startsWith('/api') || imagePath.startsWith('/submissions')) {
      imageUrl = imagePath;
    } else if (imagePath.startsWith('cases/DEMO')) {
      imageUrl = `/demo_dataset/${imagePath}`;
    } else if (imagePath === 'DEMO_SYNTHETIC_CHEST_PA' || imagePath === 'DEMO_SYNTHETIC_PHANTOM') {
      isPhantom = true;
    } else {
      imageUrl = `/images/${imagePath}`;
    }
  } else {
    isPhantom = true;
  }

  return (
    <div className="flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-md">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60">
            {viewType}
          </span>
          <span className="text-slate-400 font-mono text-[11px] truncate max-w-[200px]">
            {isPhantom ? 'DEMO_SYNTHETIC_CHEST_PHANTOM' : (imagePath || 'NO_IMAGE_LOADED')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 mr-2">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            title="Reset Pan & Zoom"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative h-96 sm:h-[460px] w-full overflow-hidden flex items-center justify-center bg-black cursor-grab active:cursor-grabbing select-none"
      >
        {isPhantom ? (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            className="relative w-80 h-96 flex flex-col items-center justify-center p-4 bg-slate-900/90 border border-teal-500/40 rounded-xl text-center select-none shadow-2xl"
          >
            <svg viewBox="0 0 300 360" className="w-full h-full text-slate-400 stroke-current opacity-85" fill="none">
              <path d="M 60 70 Q 150 90 240 70" strokeWidth="4" />
              <line x1="150" y1="70" x2="150" y2="280" strokeWidth="4" strokeDasharray="4 4" />
              <path d="M 90 100 Q 150 120 210 100" strokeWidth="2.5" />
              <path d="M 80 130 Q 150 155 220 130" strokeWidth="2.5" />
              <path d="M 75 160 Q 150 190 225 160" strokeWidth="2.5" />
              <path d="M 72 195 Q 150 225 228 195" strokeWidth="2.5" />
              <path d="M 75 230 Q 150 260 225 230" strokeWidth="2.5" />
              <path d="M 140 160 Q 110 210 135 240 Q 165 245 175 220 Q 170 170 140 160 Z" fill="#1e293b" strokeWidth="2" />
              <path d="M 60 270 Q 105 245 150 260 Q 195 245 240 270" strokeWidth="3" />
            </svg>
            <div className="absolute top-3 inset-x-0 mx-auto px-2.5 py-1 bg-black/90 rounded border border-teal-500/60 text-[10px] text-teal-300 font-mono font-bold tracking-wider max-w-[250px]">
              SYNTHETIC DEMO PHANTOM
            </div>
            <div className="absolute bottom-3 inset-x-0 mx-auto px-2 py-0.5 bg-black/90 rounded border border-slate-700 text-[9px] text-slate-400 font-mono max-w-[250px]">
              FICTITIOUS STUDY • ZERO REAL MEDICAL DATA
            </div>
          </div>
        ) : imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt="Radiographic Chest Study"
            onError={() => setImageError(true)}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            className="max-h-full max-w-full object-contain filter grayscale pointer-events-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-2">
            <ImageIcon className="w-12 h-12 text-slate-700 stroke-1" />
            <span className="text-xs font-mono">
              {imageError ? 'Radiograph image could not be loaded.' : 'No radiographic study attached.'}
            </span>
            <span className="text-[10px] text-slate-600 max-w-xs">
              Raw DICOM raster files are mapped to the local dataset directory.
            </span>
          </div>
        )}

        {/* Informative HUD Overlay */}
        <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-sm pointer-events-none border border-slate-800">
          <div>{isPhantom ? 'SYNTHETIC PHANTOM • ISOLATED DEMO' : 'DICOM GREYSCALE • 16-BIT NATIVE'}</div>
          <div>{isPhantom ? 'NO REAL PATIENT RECORD' : 'NO SYNTHETIC MARKINGS'}</div>
        </div>
      </div>
    </div>
  );
};
export default MedicalImageViewer;
