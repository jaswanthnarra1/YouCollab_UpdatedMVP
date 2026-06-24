import React, { useState, useRef } from 'react';
import { TrendingUp, Wallet, Settings } from 'lucide-react';

const FintechCard = ({ icon: Icon, title, description }) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCoords({ x, y });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="premium-black-card relative w-full max-w-3xl px-8 py-10 flex flex-col items-center text-center overflow-hidden group select-none"
    >
      {/* Subtle Dynamic Cursor-Reactive Glow (Extremely low opacity, 3% max) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-out"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(300px circle at ${coords.x}px ${coords.y}px, rgba(63, 227, 255, 0.03), transparent 80%)`,
        }}
      />

      {/* Luxury Linear Reflection Sweep Effect */}
      <div className="light-sweep-reflection" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Centered Icon Container */}
        <div className="premium-icon-box mb-6">
          <Icon className="w-5 h-5 text-white/70 group-hover:text-[#3FE3FF] transition-colors duration-400" />
        </div>

        {/* Heading */}
        <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-[#8E8E93] max-w-lg leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </div>
  );
};

export const PremiumFintechSection = () => {
  const items = [
    {
      icon: TrendingUp,
      title: "Capital Efficiency",
      description: "Higher capital efficiency with optimized rates."
    },
    {
      icon: Wallet,
      title: "Deep liquidity",
      description: "Deep liquidity. Integrations with leading DeFi markets"
    },
    {
      icon: Settings,
      title: "Open-Source Protocol",
      description: "Transparent code. All smart contracts are fully open-source"
    }
  ];

  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#050505] flex flex-col items-center">
      {/* Scoped styles to achieve pixel-perfect replication of Image 2 */}
      <style dangerouslySetInnerHTML={{ __html: `
        .premium-black-card {
          background: #0A0A0A;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.6);
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), 
                      box-shadow 0.4s cubic-bezier(0.22, 1, 0.36, 1), 
                      border-color 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, box-shadow, border-color;
          transform: translate3d(0, 0, 0);
          cursor: pointer;
        }

        .premium-black-card:hover {
          transform: translate3d(0, -4px, 0) scale(1.01);
          border-color: rgba(63, 227, 255, 0.2);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.6), 
                      0 0 16px rgba(63, 227, 255, 0.02);
        }

        .premium-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #111111;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .premium-black-card:hover .premium-icon-box {
          border-color: rgba(63, 227, 255, 0.2);
          box-shadow: 0 0 12px rgba(63, 227, 255, 0.08);
          transform: scale(1.03);
        }

        .light-sweep-reflection {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 45%,
            rgba(255, 255, 255, 0.02) 50%,
            transparent 55%
          );
          transform: rotate(30deg) translate3d(-100%, 0, 0);
          pointer-events: none;
          z-index: 2;
        }

        .premium-black-card:hover .light-sweep-reflection {
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          transform: rotate(30deg) translate3d(100%, 0, 0);
        }
      `}} />

      {/* Soft ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/[0.01] rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-cyan-400/[0.005] rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-3xl flex flex-col gap-10 items-center relative z-10">
        {items.map((item, index) => (
          <FintechCard key={index} {...item} />
        ))}
      </div>
    </section>
  );
};

export default PremiumFintechSection;
