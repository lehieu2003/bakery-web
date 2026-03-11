'use client';

import Link from 'next/link';

const ZALO_NUMBER = '0123456789'; // thay bằng số Zalo thực tế
const PHONE_NUMBER = '0123456789'; // thay bằng số điện thoại thực tế

export default function ZaloPhoneBubble() {
  return (
    <div className="fixed bottom-32 right-4 z-50 flex flex-col gap-3 items-center">
      {/* Zalo */}
      <Link
        href={`https://zalo.me/${ZALO_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Liên hệ qua Zalo"
        className="w-12 h-12 rounded-full overflow-hidden shadow-lg hover:scale-110 transition-transform duration-200 flex items-center justify-center bg-[#0068FF]"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
          aria-hidden="true"
        >
          <rect width="48" height="48" rx="24" fill="#0068FF" />
          <text
            x="24"
            y="31"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            Zalo
          </text>
        </svg>
      </Link>

      {/* Phone */}
      <Link
        href={`tel:${PHONE_NUMBER}`}
        aria-label={`Gọi điện: ${PHONE_NUMBER}`}
        className="w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-transform duration-200 flex items-center justify-center bg-green-500 animate-pulse"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="w-6 h-6"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
            clipRule="evenodd"
          />
        </svg>
      </Link>
    </div>
  );
}
