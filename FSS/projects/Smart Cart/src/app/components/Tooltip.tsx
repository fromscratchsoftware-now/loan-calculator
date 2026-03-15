import { ReactNode, useState } from "react";
import { Info } from "lucide-react";

interface TooltipProps {
  content: string;
  children?: ReactNode;
  position?: 'top' | 'bottom';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none"
      >
        {children || <Info className="w-4 h-4" />}
      </button>
      
      {isVisible && (
        <div 
          className={`absolute left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 w-64 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="relative">
            {content}
            <div 
              className={`absolute left-1/2 transform -translate-x-1/2 ${
                position === 'top' 
                  ? 'top-full -mt-1 border-4 border-transparent border-t-gray-900' 
                  : 'bottom-full -mb-1 border-4 border-transparent border-b-gray-900'
              }`}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
