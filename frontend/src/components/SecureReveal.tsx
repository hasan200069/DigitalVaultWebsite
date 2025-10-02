import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface SecureRevealProps {
  value: string;
  placeholder?: string;
  className?: string;
  blurIntensity?: number;
  revealOnHover?: boolean;
  revealOnClick?: boolean;
  copyOnClick?: boolean;
  maxLength?: number;
}

const SecureReveal: React.FC<SecureRevealProps> = ({
  value,
  placeholder = '••••••••••••••••',
  className = '',
  blurIntensity = 8,
  revealOnHover = false,
  revealOnClick = true,
  copyOnClick = false,
  maxLength = 50
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const shouldShowValue = isRevealed || (revealOnHover && isHovered);

  const handleClick = () => {
    if (revealOnClick) {
      setIsRevealed(!isRevealed);
    }
    if (copyOnClick && shouldShowValue) {
      navigator.clipboard.writeText(value);
    }
  };

  const handleMouseEnter = () => {
    if (revealOnHover) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (revealOnHover) {
      setIsHovered(false);
    }
  };

  const displayValue = shouldShowValue ? value : placeholder;
  const truncatedValue = displayValue.length > maxLength 
    ? displayValue.substring(0, maxLength) + '...' 
    : displayValue;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <span
        className={`font-mono text-sm transition-all duration-200 cursor-pointer select-none ${
          shouldShowValue 
            ? 'text-gray-900' 
            : 'text-gray-500 blur-sm'
        }`}
        style={{
          filter: shouldShowValue ? 'none' : `blur(${blurIntensity}px)`,
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={shouldShowValue ? (copyOnClick ? 'Click to copy' : 'Click to hide') : 'Click to reveal'}
      >
        {truncatedValue}
      </span>
      
      <button
        onClick={() => setIsRevealed(!isRevealed)}
        className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        title={isRevealed ? 'Hide' : 'Show'}
      >
        {isRevealed ? (
          <EyeSlashIcon className="h-4 w-4" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

export default SecureReveal;