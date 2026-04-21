const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.goalactico.net';

function layout(content: string) {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #0b1220; padding: 32px; color: #e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1px solid rgba(34,197,94,0.35);">
        <tr>
          <td style="padding: 24px 28px; background: linear-gradient(135deg, #14532d, #16a34a); color: #f8fafc;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Goalactico Pro</h1>
            <p style="margin: 6px 0 0; font-size: 14px; font-weight: 600;">Subscription update</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            ${content}
          </td>
        </tr>
      </table>
    </div>
  `;
}

function btn(href: string, label: string) {
  return `
    <a href="${href}" style="display: inline-block; background: #22c55e; color: #052e16; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 800;">
      ${label}
    </a>
  `;
}

export function subscriptionCancelledEmail(displayName: string, periodEnd: string) {
  console.log('-------------------------- Cancel Email Notification is coming --------------------', displayName, 
    periodEnd);

  const safeName = displayName || 'Player';
  const subject = 'Your Goalactico Pro subscription has been cancelled';
  const html = layout(`
    <h2 style="margin:0 0 12px;font-size:18px;color:#ffffff;">
      Hi ${safeName}, your subscription has been cancelled
    </h2>
    <p style="margin:0 0 14px;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.7;">
      Your Goalactico Pro subscription has been cancelled. You will continue to have full Pro access until
      <strong style="color:#ffffff;">${periodEnd}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.7;">
      After that date your account will automatically revert to the free plan. You can resubscribe at any time
      and your prediction history will be kept.
    </p>
    <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);">
        You still have access to all Pro features until
        <strong style="color:#4ade80;">${periodEnd}</strong>
      </p>
    </div>
    ${btn(`${BASE_URL}/subscription`, 'Resubscribe')}
  `);

  const text = `
Hi ${safeName},

Your Goalactico Pro subscription has been cancelled.

You will continue to have full Pro access until ${periodEnd}.
After that your account reverts to the free plan.

You can resubscribe at any time: ${BASE_URL}/subscription
  `.trim();

  return { subject, html, text };
}
