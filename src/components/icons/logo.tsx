
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <defs>
        <linearGradient
          id="grad1"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            style={{ stopColor: '#F59E0B', stopOpacity: 1 }}
          />
          <stop
            offset="100%"
            style={{ stopColor: '#EF4444', stopOpacity: 1 }}
          />
        </linearGradient>
      </defs>
      <path
        fill="url(#grad1)"
        d="M12.64,3.54C11.57,2.47 10.7,4.3,10.2,5.25c-1.11,2.08-.22,3.88,1.22,4.42c-2,1.06-2.32,3.48-0.88,4.92c1.44,1.44,3.85,1.13,4.92-0.88c0.44-0.82,0.5-2-0.23-3.08c1.3-0.32,2.3-1.7,2.15-3.08C16.82,5.1,14.34,5.43,12.64,3.54z"
      ></path>
      <path
        fill="url(#grad1)"
        d="M11.36,20.46c1.07,1.07,1.94-0.83,2.44-1.78c1.11-2.08,0.22-3.88-1.22-4.42c2-1.06,2.32-3.48,0.88-4.92c-1.44-1.44-3.85-1.13-4.92,0.88c-0.44,0.82-0.5,2,0.23,3.08c-1.3,0.32-2.3,1.7-2.15,3.08C7.18,18.9,9.66,18.57,11.36,20.46z"
      ></path>
    </svg>
  );
}
