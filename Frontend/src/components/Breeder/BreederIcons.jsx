import React from 'react';

const paths = {
  dashboard: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  document: 'M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V7h3.5',
  renew: 'M4 4v6h6M20 20v-6h-6M5.6 15a7 7 0 0 0 11.8 2M18.4 9A7 7 0 0 0 6.6 7',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  shield: 'M12 2 5 5v6c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V5l-7-3Z',
  calendar: 'M7 2v4M17 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  animals: 'M5 19c1.5-4 4-6 7-6s5.5 2 7 6M8 9a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z',
  alert: 'M12 3 2 21h20L12 3Zm0 6v5m0 3h.01',
  check: 'M20 6 9 17l-5-5',
  user: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm8 9a8 8 0 0 0-16 0',
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z',
  search: 'm21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm12-16 4 4',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z',
  mail: 'M4 4h16v16H4V4Zm0 3 8 6 8-6'
};

const BreederIcon = ({ name, size = 18, className = '' }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={paths[name] || paths.document} />
  </svg>
);

export default BreederIcon;
