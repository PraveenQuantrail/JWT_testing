import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiGrid,
  FiMaximize,
  FiMinimize,
  FiChevronLeft,
  FiChevronRight,
  FiZoomIn,
  FiDownload,
  FiRotateCw,
  FiRefreshCw
} from "react-icons/fi";

const ImageGalleryModal = ({ isOpen, onClose, images, startIndex }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setCurrentIndex(startIndex);
    setImageLoaded(false);
    setZoomLevel(1);
    setRotation(0);
  }, [startIndex, isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isFullscreen]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setImageLoaded(false);
    setZoomLevel(1);
    setRotation(0);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setImageLoaded(false);
    setZoomLevel(1);
    setRotation(0);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleThumbnails = () => {
    setShowThumbnails(!showThumbnails);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  const handleRotateRight = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation(prev => (prev - 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[currentIndex];
    link.download = `quantchat-chart-${currentIndex + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'bg-black' : 'bg-black/90 backdrop-blur-sm'
        }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors duration-200 p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-sm"
          >
            <FiX size={20} />
            <span className="text-sm font-medium">Close</span>
          </button>

          <div className="flex items-center space-x-1 bg-black/50 rounded-lg p-1 backdrop-blur-sm">
            <span className="text-white text-sm font-medium px-2">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleThumbnails}
            className="p-3 text-white hover:text-[#5D3FD3] transition-colors duration-200 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            title={showThumbnails ? "Hide thumbnails" : "Show thumbnails"}
          >
            <FiGrid size={18} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-3 text-white hover:text-[#5D3FD3] transition-colors duration-200 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-6 z-30 p-4 text-white hover:text-[#5D3FD3] transition-all duration-200 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transform hover:scale-110"
              style={{ left: '2rem' }}
            >
              <FiChevronLeft size={24} />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-6 z-30 p-4 text-white hover:text-[#5D3FD3] transition-all duration-200 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transform hover:scale-110"
              style={{ right: '2rem' }}
            >
              <FiChevronRight size={24} />
            </button>
          </>
        )}

        {/* Image Display */}
        <div className="relative max-w-5xl max-h-[80vh] flex items-center justify-center">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#5D3FD3]/20 border-t-[#5D3FD3] rounded-full animate-spin" />
            </div>
          )}

          <motion.div
            className={`relative ${imageLoaded ? 'block' : 'invisible'}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={images[currentIndex]}
              alt={`Generated chart visualization ${currentIndex + 1}`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease'
              }}
              onLoad={handleImageLoad}
            />

            {/* Image Overlay Info */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
              <span className="text-white text-sm font-medium">
                Chart {currentIndex + 1} of {images.length}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-40 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          {/* Thumbnail Strip */}
          {showThumbnails && images.length > 1 && (
            <div className="flex-1 flex items-center justify-center space-x-2 max-w-2xl mx-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setImageLoaded(false);
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all duration-200 transform hover:scale-110 ${index === currentIndex
                    ? 'border-[#5D3FD3] scale-110 shadow-lg shadow-[#5D3FD3]/30'
                    : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center space-x-2 bg-black/50 rounded-xl p-2 backdrop-blur-sm">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 border-r border-gray-600 pr-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="p-2 text-white hover:text-[#5D3FD3] transition-colors duration-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                title="Zoom Out"
              >
                <FiZoomIn className="rotate-180" size={18} />
              </button>

              <span className="text-white text-xs font-medium min-w-[45px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="p-2 text-white hover:text-[#5D3FD3] transition-colors duration-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                title="Zoom In"
              >
                <FiZoomIn size={18} />
              </button>

              <button
                onClick={handleZoomReset}
                className="p-2 text-white hover:text-[#5D3FD3] transition-colors duration-200 rounded-lg"
                title="Reset Zoom"
              >
                <FiRefreshCw size={16} />
              </button>
            </div>

            {/* Rotation Controls */}
            <div className="flex items-center space-x-1 border-r border-gray-600 pr-2">
              <button
                onClick={handleRotateLeft}
                className="p-2 text-white hover:text-[#5D3FD3] transition-colors duration-200 rounded-lg"
                title="Rotate Left"
              >
                <FiRotateCw className="rotate-90" size={18} />
              </button>

              <button
                onClick={handleRotateRight}
                className="p-2 text-white hover:text-[#5D3FD3] transition-colors duration-200 rounded-lg"
                title="Rotate Right"
              >
                <FiRotateCw className="-rotate-90" size={18} />
              </button>
            </div>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 text-white hover:text-[#5D3FD3] transition-colors duration-200 rounded-lg"
              title="Download"
            >
              <FiDownload size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Background Overlay Click to Close */}
      <div
        className="absolute inset-0 z-0"
        onClick={onClose}
      />
    </motion.div>
  );
};

export default ImageGalleryModal;