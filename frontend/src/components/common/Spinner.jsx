import React from 'react';

const Spinner = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <svg
        className="animate-spin h-6 w-6 text-[#00d492]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 4.418 1.79 8.418 4.686 11.314l1.414-1.414z"
        />
      </svg>
    </div>
  );
};

export default Spinner;