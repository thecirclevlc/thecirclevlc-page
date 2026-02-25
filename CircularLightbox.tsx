import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface CircularLightboxProps {
  image: string;
  isOpen: boolean;
  onClose: () => void;
  clickPosition?: { x: number; y: number };
}

export const CircularLightbox: React.FC<CircularLightboxProps> = ({ image, isOpen, onClose, clickPosition }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const overlay = overlayRef.current;
    const circle = circleRef.current;
    const img = imageRef.current;
    const closeBtn = closeButtonRef.current;

    if (!overlay || !circle || !img || !closeBtn) return;

    // Get click position or use center of screen
    const startX = clickPosition?.x ?? window.innerWidth / 2;
    const startY = clickPosition?.y ?? window.innerHeight / 2;

    // Set initial position
    gsap.set(circle, {
      left: startX,
      top: startY,
      xPercent: -50,
      yPercent: -50,
    });

    // Opening animation - circular expansion
    const tl = gsap.timeline();

    tl.fromTo(
      overlay,
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
      }
    )
      .fromTo(
        circle,
        {
          scale: 0,
          rotation: -180,
        },
        {
          scale: 1,
          rotation: 0,
          duration: 1.2,
          ease: 'elastic.out(1, 0.6)',
        },
        '-=0.2'
      )
      .fromTo(
        img,
        {
          opacity: 0,
          scale: 1.2,
          filter: 'blur(20px)',
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.8,
          ease: 'power2.out',
        },
        '-=0.6'
      )
      .fromTo(
        closeBtn,
        {
          opacity: 0,
          scale: 0,
          rotation: -90,
        },
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 0.6,
          ease: 'back.out(1.7)',
        },
        '-=0.4'
      );
  }, [isOpen, clickPosition]);

  const handleClose = () => {
    const overlay = overlayRef.current;
    const circle = circleRef.current;
    const img = imageRef.current;
    const closeBtn = closeButtonRef.current;

    if (!overlay || !circle || !img || !closeBtn) {
      onClose();
      return;
    }

    // Closing animation - circular collapse
    const tl = gsap.timeline({
      onComplete: onClose,
    });

    tl.to(closeBtn, {
      opacity: 0,
      scale: 0,
      rotation: 90,
      duration: 0.3,
      ease: 'back.in(1.7)',
    })
      .to(
        img,
        {
          opacity: 0,
          scale: 0.8,
          filter: 'blur(20px)',
          duration: 0.4,
          ease: 'power2.in',
        },
        '-=0.2'
      )
      .to(
        circle,
        {
          scale: 0,
          rotation: 180,
          duration: 0.8,
          ease: 'back.in(1.4)',
        },
        '-=0.3'
      )
      .to(
        overlay,
        {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
        },
        '-=0.5'
      );
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={handleClose}
    >
      {/* Circular container */}
      <div
        ref={circleRef}
        className="fixed"
        style={{
          width: '90vmin',
          height: '90vmin',
          maxWidth: '800px',
          maxHeight: '800px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Circle border */}
        <div className="absolute inset-0 rounded-full border-4 border-[#C42121]/30 overflow-hidden">
          {/* Image */}
          <img
            ref={imageRef}
            src={image}
            alt="Event detail"
            className="w-full h-full object-cover rounded-full"
          />
        </div>

        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={handleClose}
          className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-[#C42121] text-black font-black text-2xl hover:bg-[#ff3333] hover:scale-110 transition-all duration-300 flex items-center justify-center shadow-2xl"
        >
          ×
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#C42121]/60 text-sm font-mono tracking-wider">
        CLICK ANYWHERE TO CLOSE
      </div>
    </div>
  );
};

// Hook to use the lightbox
export const useCircularLightbox = () => {
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    image: string;
    clickPosition?: { x: number; y: number };
  }>({
    isOpen: false,
    image: '',
  });

  const openLightbox = (image: string, event?: React.MouseEvent) => {
    const clickPosition = event
      ? {
          x: event.clientX,
          y: event.clientY,
        }
      : undefined;

    setLightboxState({
      isOpen: true,
      image,
      clickPosition,
    });
  };

  const closeLightbox = () => {
    setLightboxState({
      isOpen: false,
      image: '',
    });
  };

  return {
    lightboxState,
    openLightbox,
    closeLightbox,
  };
};
