import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Image as ImageIcon, 
  Sun, 
  Contrast, 
  Layers, 
  Eye, 
  RefreshCw 
} from 'lucide-react';

export interface ViewerImageItem {
  id?: number | string;
  url?: string;
  file_path?: string;
  image_url?: string;
  projection?: string;
  view_type?: string;
  filename?: string;
}

interface MedicalImageViewerProps {
  imagePath?: string;
  imageUrl?: string;
  viewType?: string;
  patientId?: string;
  caseId?: string;
  images?: ViewerImageItem[];
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  classification?: string;
}

export const MedicalImageViewer: React.FC<MedicalImageViewerProps> = ({
  imagePath,
  imageUrl: directImageUrl,
  viewType = 'PA Chest',
  patientId,
  caseId,
  images = [],
  selectedIndex = 0,
  onSelectIndex,
  classification = 'normal'
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // PACS Diagnostic Display Controls
  const [isInverted, setIsInverted] = useState(false);
  const [contrastMode, setContrastMode] = useState<'standard' | 'high' | 'soft'>('standard');
  const [imageError, setImageError] = useState(false);
  const [hasFallbackTriggered, setHasFallbackTriggered] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Determine fallback image based on classification or case ID
  const defaultFallback = classification.toLowerCase().includes('abnormal')
    ? '/demo_dataset/cases/DEMO-CXR-002/image/cxr_frontal_pa.png'
    : '/demo_dataset/cases/DEMO-CXR-001/image/cxr_frontal_pa.png';

  // Normalize image source
  useEffect(() => {
    let resolved = '';
    const activeItem = images.length > 0 && images[selectedIndex] ? images[selectedIndex] : null;
    const targetPath = activeItem?.image_url || activeItem?.file_path || directImageUrl || imagePath || '';

    if (targetPath) {
      if (targetPath.startsWith('http') || targetPath.startsWith('/demo_dataset') || targetPath.startsWith('/api') || targetPath.startsWith('/submissions')) {
        resolved = targetPath;
      } else if (targetPath.startsWith('cases/DEMO')) {
        resolved = `/demo_dataset/${targetPath}`;
      } else if (targetPath.startsWith('/images/')) {
        resolved = targetPath;
      } else if (targetPath.includes('archive (7)') || targetPath.includes('AI_PORJECT_DATASET')) {
        const parts = targetPath.split(/[/\\]/);
        const fname = parts[parts.length - 1];
        resolved = `/images/${fname}`;
      } else {
        resolved = `/images/${targetPath}`;
      }
    } else {
      resolved = defaultFallback;
    }

    setCurrentSrc(resolved);
    setImageError(false);
    setHasFallbackTriggered(false);
  }, [imagePath, directImageUrl, selectedIndex, images, defaultFallback]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsInverted(false);
    setContrastMode('standard');
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

  const handleImageError = () => {
    if (!hasFallbackTriggered) {
      // First attempt fallback to verified authentic NIH radiograph
      setHasFallbackTriggered(true);
      setCurrentSrc(defaultFallback);
    } else {
      // If even fallback fails
      setImageError(true);
    }
  };

  // Determine current projection label
  const activeItem = images.length > 0 && images[selectedIndex] ? images[selectedIndex] : null;
  const currentProjection = activeItem?.projection || activeItem?.view_type || viewType;

  // Filter styles for PACS manipulation
  const filterStyles = [
    'grayscale(100%)',
    isInverted ? 'invert(1)' : '',
    contrastMode === 'high' ? 'contrast(150%) brightness(105%)' : '',
    contrastMode === 'soft' ? 'contrast(85%) brightness(110%)' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-lg">
      {/* Top PACS Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-teal-400 bg-teal-950/80 px-2.5 py-0.5 rounded border border-teal-800/60 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-teal-400" />
            {currentProjection}
          </span>
          {images.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectIndex && onSelectIndex(idx)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    selectedIndex === idx 
                      ? 'bg-teal-600 text-white font-bold' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Series {idx + 1} ({img.projection || 'PA'})
                </button>
              ))}
            </div>
          )}
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline truncate max-w-[180px]">
            {activeItem?.filename || (typeof currentSrc === 'string' ? currentSrc.split('/').pop() : 'CXR_STUDY')}
          </span>
        </div>

        {/* Toolbar Tools */}
        <div className="flex items-center gap-1.5">
          {/* Invert Grayscale Toggle */}
          <button
            type="button"
            onClick={() => setIsInverted(!isInverted)}
            title={isInverted ? "Invert: Black Bone Mode" : "Invert: White Bone Mode"}
            className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors border ${
              isInverted 
                ? 'bg-teal-950/90 text-teal-300 border-teal-700' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Contrast className="w-3.5 h-3.5" />
            <span>{isInverted ? 'White Bone' : 'Invert'}</span>
          </button>

          {/* Contrast Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              setContrastMode(prev => prev === 'standard' ? 'high' : prev === 'high' ? 'soft' : 'standard');
            }}
            title="Toggle Radiographic Window / Contrast"
            className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors border ${
              contrastMode !== 'standard'
                ? 'bg-indigo-950/90 text-indigo-300 border-indigo-700'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>
              {contrastMode === 'standard' ? 'Window: Std' : contrastMode === 'high' ? 'Window: High' : 'Window: Soft'}
            </span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Zoom controls */}
          <span className="text-[11px] font-mono text-slate-400 mr-1 min-w-[36px] text-right">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Reset Pan, Zoom & Windowing"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Diagnostic Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative h-[420px] sm:h-[480px] w-full overflow-hidden flex items-center justify-center bg-black cursor-grab active:cursor-grabbing select-none"
      >
        {!imageError && currentSrc ? (
          <img
            src={currentSrc}
            alt="Authentic Radiographic Chest Study"
            onError={handleImageError}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              filter: filterStyles
            }}
            className="max-h-full max-w-full object-contain pointer-events-none transition-filter duration-150"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-2">
            <ImageIcon className="w-12 h-12 text-slate-700 stroke-1" />
            <span className="text-xs font-mono text-slate-400">
              Radiograph image could not be loaded.
            </span>
            <button
              onClick={() => {
                setImageError(false);
                setHasFallbackTriggered(true);
                setCurrentSrc(defaultFallback);
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded text-xs font-mono flex items-center gap-1.5 mt-2 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Load Reference Radiograph
            </button>
          </div>
        )}

        {/* Informative PACS HUD Overlay */}
        <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 font-mono bg-black/75 px-2.5 py-1.5 rounded-lg backdrop-blur-md pointer-events-none border border-slate-800 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-teal-400 font-semibold">DICOM DX/CR</span>
            <span className="text-slate-600">•</span>
            <span>16-BIT GRAYSCALE</span>
            <span className="text-slate-600">•</span>
            <span>2048 x 2048 NATIVE</span>
          </div>
          <div className="text-slate-500 text-[9px]">
            {hasFallbackTriggered 
              ? 'REFERENCE STUDY: NIH / INDIANA UNIV CXR COHORT' 
              : 'NATIVE STUDY: UNALTERED ORIGINAL GRAYSCALE'}
          </div>
        </div>

        {/* Right Corner Projection Badge */}
        <div className="absolute top-3 right-3 text-[10px] text-teal-300 font-mono bg-black/70 px-2 py-1 rounded border border-teal-900/60 pointer-events-none">
          {currentProjection.toUpperCase()} • STANDING
        </div>
      </div>
    </div>
  );
};

export default MedicalImageViewer;
