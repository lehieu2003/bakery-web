import { ImageResponse } from 'next/og';

export const alt = 'La Douceur Bakery';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background:
            'linear-gradient(135deg, #fff6ec 0%, #f3e2d0 55%, #e8c49a 100%)',
          color: '#5a2e16',
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        <div>La Douceur</div>
        <div style={{ fontSize: 28, marginTop: 16, fontWeight: 500 }}>
          Handcrafted Cakes for Every Celebration
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
