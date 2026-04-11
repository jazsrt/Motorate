/**
 * Badge share card generator.
 * Renders a 1080x1920 (Instagram Story format) PNG of a badge earned,
 * then either shares it via Web Share API or downloads it.
 */

export interface BadgeShareCardData {
  badgeName: string;
  badgeTier: string;
  badgeDescription: string;
  badgeIconPath?: string;
  userHandle: string;
  vehicleName?: string;
  vehicleImageUrl?: string;
  deepLinkUrl: string;
}

const W = 1080;
const H = 1920;

export async function generateBadgeShareImage(data: BadgeShareCardData): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background — dark gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, H);
  bgGradient.addColorStop(0, '#0a1220');
  bgGradient.addColorStop(0.5, '#060c16');
  bgGradient.addColorStop(1, '#030508');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, W, H);

  // Optional vehicle photo as faint background
  if (data.vehicleImageUrl) {
    try {
      const vImg = await loadImage(data.vehicleImageUrl);
      ctx.save();
      ctx.globalAlpha = 0.12;
      // Cover fit
      const vRatio = vImg.width / vImg.height;
      const cRatio = W / H;
      let dw: number, dh: number, dx: number, dy: number;
      if (vRatio > cRatio) {
        dh = H;
        dw = H * vRatio;
        dx = (W - dw) / 2;
        dy = 0;
      } else {
        dw = W;
        dh = W / vRatio;
        dx = 0;
        dy = (H - dh) / 2;
      }
      ctx.drawImage(vImg, dx, dy, dw, dh);
      ctx.restore();

      // Re-apply bottom gradient for legibility
      const scrim = ctx.createLinearGradient(0, H * 0.3, 0, H);
      scrim.addColorStop(0, 'rgba(3,5,8,0.2)');
      scrim.addColorStop(0.7, 'rgba(3,5,8,0.88)');
      scrim.addColorStop(1, '#030508');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, W, H);
    } catch { /* silent fail */ }
  }

  // Orange accent border frame
  ctx.strokeStyle = 'rgba(249,115,22,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // Top: MOTORATE wordmark
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 72px "Rajdhani", system-ui, sans-serif';
  const wordmarkY = 180;
  const motoW = ctx.measureText('MOTO').width;
  const rW = ctx.measureText('R').width;
  const ateW = ctx.measureText('ATE').width;
  const totalW = motoW + rW + ateW;
  const startX = (W - totalW) / 2;
  ctx.fillStyle = '#eef4f8';
  ctx.textAlign = 'left';
  ctx.fillText('MOTO', startX, wordmarkY);
  ctx.fillStyle = '#F97316';
  ctx.fillText('R', startX + motoW, wordmarkY);
  ctx.fillStyle = '#eef4f8';
  ctx.fillText('ATE', startX + motoW + rW, wordmarkY);
  ctx.textAlign = 'center';

  // Thin orange underline below wordmark
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 100, 210);
  ctx.lineTo(W / 2 + 100, 210);
  ctx.stroke();

  // "BADGE UNLOCKED" label
  ctx.fillStyle = '#F97316';
  ctx.font = '700 38px "Barlow Condensed", system-ui, sans-serif';
  ctx.fillText('★ BADGE UNLOCKED ★', W / 2, 290);

  // Badge image (large, centered)
  const badgeY = 380;
  const badgeSize = 520;
  if (data.badgeIconPath) {
    try {
      const badgeImg = await loadImage(data.badgeIconPath);

      // Radial glow behind badge
      const glowGrad = ctx.createRadialGradient(W / 2, badgeY + badgeSize / 2, 0, W / 2, badgeY + badgeSize / 2, badgeSize * 0.8);
      glowGrad.addColorStop(0, 'rgba(249,115,22,0.35)');
      glowGrad.addColorStop(0.5, 'rgba(249,115,22,0.08)');
      glowGrad.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(W / 2 - badgeSize, badgeY - badgeSize / 2, badgeSize * 2, badgeSize * 2);

      ctx.drawImage(badgeImg, (W - badgeSize) / 2, badgeY, badgeSize, badgeSize);
    } catch { /* silent fail — fall through to text */ }
  }

  // Badge name
  ctx.fillStyle = '#eef4f8';
  ctx.font = '700 96px "Rajdhani", system-ui, sans-serif';
  wrapText(ctx, data.badgeName.toUpperCase(), W / 2, 1050, W - 200, 100);

  // Tier
  const tierY = 1160;
  ctx.fillStyle = tierColor(data.badgeTier);
  ctx.font = '700 44px "Barlow Condensed", system-ui, sans-serif';
  ctx.fillText(data.badgeTier.toUpperCase(), W / 2, tierY);

  // Divider
  ctx.strokeStyle = 'rgba(249,115,22,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 80, tierY + 30);
  ctx.lineTo(W / 2 + 80, tierY + 30);
  ctx.stroke();

  // Description
  ctx.fillStyle = '#a8bcc8';
  ctx.font = '500 38px "Barlow", system-ui, sans-serif';
  wrapText(ctx, data.badgeDescription, W / 2, 1260, W - 200, 52);

  // Vehicle line (if provided)
  if (data.vehicleName) {
    ctx.fillStyle = '#F97316';
    ctx.font = '700 32px "Barlow Condensed", system-ui, sans-serif';
    ctx.fillText(`EARNED ON ${data.vehicleName.toUpperCase()}`, W / 2, 1460);
  }

  // Footer: user handle + URL
  ctx.fillStyle = '#eef4f8';
  ctx.font = '700 52px "Rajdhani", system-ui, sans-serif';
  ctx.fillText(`@${data.userHandle}`, W / 2, 1680);

  // Orange divider
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 70, 1720);
  ctx.lineTo(W / 2 + 70, 1720);
  ctx.stroke();

  // URL
  ctx.fillStyle = '#7a8e9e';
  ctx.font = '600 36px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillText('motorate.app', W / 2, 1790);

  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png', 0.95));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function tierColor(tier: string): string {
  const t = tier.toLowerCase();
  if (t === 'platinum' || t === 'plat') return '#8a88a8';
  if (t === 'gold') return '#c8a85a';
  if (t === 'silver') return '#909aaa';
  if (t === 'bronze') return '#9a7a58';
  return '#F97316';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let yPos = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, yPos);
      line = word + ' ';
      yPos += lineHeight;
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, yPos);
}

/**
 * Generate and share a badge card.
 * Tries Web Share API with files first (mobile), falls back to download.
 */
export async function shareBadgeImage(data: BadgeShareCardData): Promise<'shared' | 'downloaded' | 'failed'> {
  try {
    const blob = await generateBadgeShareImage(data);
    if (!blob) return 'failed';

    const fileName = `motorate-${data.badgeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    // Try native share with files (iOS Safari, Chrome Android)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${data.badgeName} — MotoRate`,
          text: `I earned the ${data.badgeName} badge on MotoRate! ${data.deepLinkUrl}`,
        });
        return 'shared';
      } catch (err) {
        // User cancelled or share failed — fall through to download
        if (err instanceof Error && err.name === 'AbortError') return 'failed';
      }
    }

    // Fallback: download the image
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return 'downloaded';
  } catch (err) {
    console.error('[shareBadgeImage]', err);
    return 'failed';
  }
}
