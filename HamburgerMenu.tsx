import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';

export const HamburgerMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const circle1Ref = useRef<HTMLDivElement>(null);
  const circle2Ref = useRef<HTMLDivElement>(null);
  const circle3Ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const overlay = overlayRef.current;
    const menuItems = menuItemsRef.current;
    const button = buttonRef.current;
    const c1 = circle1Ref.current;
    const c2 = circle2Ref.current;
    const c3 = circle3Ref.current;

    if (!overlay || !menuItems || !button || !c1 || !c2 || !c3) return;

    if (isOpen) {
      // Get button position for circular expansion origin
      const buttonRect = button.getBoundingClientRect();
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const buttonCenterY = buttonRect.top + buttonRect.height / 2;

      // Calculate the radius needed to cover the entire screen from button position
      const maxDistX = Math.max(buttonCenterX, window.innerWidth - buttonCenterX);
      const maxDistY = Math.max(buttonCenterY, window.innerHeight - buttonCenterY);
      const maxRadius = Math.sqrt(maxDistX * maxDistX + maxDistY * maxDistY);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Opening animation - Spectacular circular expansion
      const tl = gsap.timeline();

      // Animate circles to X
      tl.to(c1, {
        rotation: 45,
        x: 5,
        y: 0,
        duration: 0.6,
        ease: 'expo.inOut',
      })
        .to(
          c2,
          {
            opacity: 0,
            scale: 0,
            duration: 0.4,
            ease: 'expo.inOut',
          },
          '-=0.5'
        )
        .to(
          c3,
          {
            rotation: -45,
            x: -5,
            y: 0,
            duration: 0.6,
            ease: 'expo.inOut',
          },
          '-=0.6'
        );

      // Set initial clip-path from button position
      const clipPathStart = `circle(0px at ${buttonCenterX}px ${buttonCenterY}px)`;
      const clipPathEnd = `circle(${maxRadius}px at ${buttonCenterX}px ${buttonCenterY}px)`;

      // Circular expansion animation
      gsap.fromTo(
        overlay,
        {
          opacity: 1,
          clipPath: clipPathStart,
        },
        {
          clipPath: clipPathEnd,
          duration: 1.2,
          ease: 'expo.inOut',
          delay: 0.1,
        }
      );

      // Animate menu items - They start from center and disperse
      const items = menuItems.querySelectorAll('.menu-item');

      gsap.fromTo(
        items,
        {
          opacity: 0,
          scale: 0.3,
          x: window.innerWidth / 2 - buttonCenterX,
          y: window.innerHeight / 2 - buttonCenterY,
        },
        {
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          duration: 1,
          stagger: 0.1,
          delay: 0.5,
          ease: 'expo.out',
        }
      );
    } else {
      // Closing animation - Items collapse and circle shrinks
      const tl = gsap.timeline({
        onComplete: () => {
          document.body.style.overflow = '';
        },
      });

      // Animate circles back
      tl.to(c1, {
        rotation: 0,
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'expo.inOut',
      })
        .to(
          c2,
          {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: 'expo.inOut',
          },
          '-=0.4'
        )
        .to(
          c3,
          {
            rotation: 0,
            x: 0,
            y: 0,
            duration: 0.5,
            ease: 'expo.inOut',
          },
          '-=0.5'
        );

      // Hide menu items - collapse to center
      const items = menuItems.querySelectorAll('.menu-item');
      gsap.to(items, {
        opacity: 0,
        scale: 0.3,
        duration: 0.5,
        stagger: 0.05,
        ease: 'expo.in',
      });

      // Get button position for collapse
      const buttonRect = button.getBoundingClientRect();
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const buttonCenterY = buttonRect.top + buttonRect.height / 2;

      // Collapse circle back to button position
      gsap.to(overlay, {
        clipPath: `circle(0px at ${buttonCenterX}px ${buttonCenterY}px)`,
        duration: 0.8,
        delay: 0.2,
        ease: 'expo.inOut',
        onComplete: () => {
          gsap.set(overlay, { opacity: 0 });
        },
      });
    }

    // Cleanup: Restore body scroll if component unmounts while menu is open
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleMenuClick = (path: string) => {
    // Navigate first while menu is still open
    window.scrollTo(0, 0);
    navigate(path);

    // Close menu after navigation starts (smooth transition)
    setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  return (
    <>
      {/* Hamburger Icon - 3 horizontal circles */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="relative z-[10001] flex flex-row items-center justify-center gap-2 w-12 h-12 cursor-pointer group"
        aria-label="Menu"
      >
        <div ref={circle1Ref} className="w-2.5 h-2.5 bg-[#C42121] rounded-full" />
        <div ref={circle2Ref} className="w-2.5 h-2.5 bg-[#C42121] rounded-full" />
        <div ref={circle3Ref} className="w-2.5 h-2.5 bg-[#C42121] rounded-full" />
      </button>

      {/* Full Page Overlay Menu */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 bg-black z-[10000] flex items-center justify-center ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{ opacity: 0 }}
      >
        {/* Subtle radial gradient for depth */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(196, 33, 33, 0.15) 0%, transparent 60%)',
          }}
        />

        {/* Menu Items Container */}
        <div ref={menuItemsRef} className="relative z-10 w-full max-w-5xl px-8">
          <nav className="flex flex-col items-center justify-center gap-3 md:gap-5 lg:gap-6">
            <MenuItem label="HOME"        onClick={() => handleMenuClick('/')} />
            <MenuItem label="PAST EVENTS" onClick={() => handleMenuClick('/past-events')} />
            <MenuItem label="DJS"         onClick={() => handleMenuClick('/djs')} />
            <MenuItem label="ARTISTS"     onClick={() => handleMenuClick('/artists')} />
            <MenuItem label="JOIN US"     onClick={() => handleMenuClick('/form')} />
          </nav>
        </div>
      </div>
    </>
  );
};

// Menu Item — refined hover: subtle lift + color + underline sweep
const MenuItem: React.FC<{ label: string; onClick?: () => void }> = React.memo(({
  label,
  onClick,
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const tlRef   = useRef<gsap.core.Timeline | null>(null);

  const handleMouseEnter = () => {
    tlRef.current?.kill();
    const tl = gsap.timeline();
    tlRef.current = tl;

    // Text: subtle lift + brighten — everything moves together, no stagger
    tl.to(textRef.current, {
      y: -4,
      color: '#FF3A3A',
      duration: 0.45,
      ease: 'power3.out',
    }, 0);

    // Underline: precise wipe left → right
    tl.fromTo(
      lineRef.current,
      { scaleX: 0, transformOrigin: '0% 50%' },
      { scaleX: 1, transformOrigin: '0% 50%', duration: 0.5, ease: 'power3.inOut' },
      0,
    );
  };

  const handleMouseLeave = () => {
    tlRef.current?.kill();
    const tl = gsap.timeline();
    tlRef.current = tl;

    // Text: return to rest
    tl.to(textRef.current, {
      y: 0,
      color: '#C42121',
      duration: 0.4,
      ease: 'power2.out',
    }, 0);

    // Underline: retract right → left
    tl.to(lineRef.current, {
      scaleX: 0,
      transformOrigin: '100% 50%',
      duration: 0.35,
      ease: 'power3.in',
    }, 0);
  };

  return (
    <div className="menu-item w-full">
      <div
        className="relative flex items-center justify-center py-2 md:py-3 cursor-pointer select-none"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Single text block — GSAP owns color + transform */}
        <div
          ref={textRef}
          className="font-black tracking-tight leading-none"
          style={{ fontSize: 'clamp(2rem, 8vw, 6.5rem)', color: '#C42121', willChange: 'transform, color' }}
        >
          {label}
        </div>

        {/* Underline — GSAP owns scaleX exclusively */}
        <div
          ref={lineRef}
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF3A3A]"
          style={{ transform: 'scaleX(0)', transformOrigin: '0% 50%' }}
        />
      </div>
    </div>
  );
});
