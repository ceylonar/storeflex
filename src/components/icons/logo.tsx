
import Image from 'next/image';
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <Image
      src="https://i.postimg.cc/tCKbfghT/logo-3-1.png"
      alt="StoreFlex Lite Logo"
      width={40}
      height={40}
      className={props.className}
      priority
    />
  );
}
