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
          <nav className="flex flex-col items-center justify-center gap-8 md:gap-12 lg:gap-16">
            <MenuItem label="HOME" onClick={() => handleMenuClick('/')} />
            {/* <MenuItem label="COMING SOON" disabled /> */}
            <MenuItem label="JOIN US" onClick={() => handleMenuClick('/form')} />
          </nav>
        </div>
      </div>
    </>
  );
};

// Menu Item Component with red text and sophisticated hover effects
const MenuItem: React.FC<{ label: string; onClick?: () => void }> = React.memo(({
  label,
  onClick,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const underlineRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const item = itemRef.current;
    const underline = underlineRef.current;
    if (!item || !underline) return;

    // Sophisticated hover animation
    gsap.to(item, {
      x: 20,
      scale: 1.05,
      color: '#ff4444',
      duration: 0.6,
      ease: 'expo.out',
    });

    gsap.to(underline, {
      scaleX: 1,
      duration: 0.6,
      ease: 'expo.out',
    });
  };

  const handleMouseLeave = () => {
    const item = itemRef.current;
    const underline = underlineRef.current;
    if (!item || !underline) return;

    gsap.to(item, {
      x: 0,
      scale: 1,
      color: '#C42121',
      duration: 0.6,
      ease: 'expo.out',
    });

    gsap.to(underline, {
      scaleX: 0,
      duration: 0.6,
      ease: 'expo.out',
    });
  };

  return (
    <div className="menu-item relative w-full">
      <div
        ref={itemRef}
        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-none py-4 md:py-6 text-center text-[#C42121] cursor-pointer select-none transition-colors duration-300"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {label}
        {/* Animated underline */}
        <div
          ref={underlineRef}
          className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 h-[3px] md:h-[4px] w-4/5 bg-gradient-to-r from-transparent via-[#ff4444] to-transparent origin-center"
          style={{ scaleX: 0 }}
        />
      </div>
    </div>
  );
});
