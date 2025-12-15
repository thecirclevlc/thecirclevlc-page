import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Captcha token is required' 
      });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY is not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }

    // Verify the captcha with Google
    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const verificationResponse = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${captchaToken}`,
    });

    const verificationData: RecaptchaResponse = await verificationResponse.json();

    if (verificationData.success) {
      return res.status(200).json({ 
        success: true,
        message: 'Captcha verified successfully' 
      });
    } else {
      console.error('Captcha verification failed:', verificationData['error-codes']);
      return res.status(400).json({ 
        success: false, 
        error: 'Captcha verification failed',
        errorCodes: verificationData['error-codes']
      });
    }
  } catch (error) {
    console.error('Error verifying captcha:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

