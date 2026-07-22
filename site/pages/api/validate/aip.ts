import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAip } from '../../../lib/validators/aip';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Expecting raw PEM string in body (text/plain) or json { "pem": "..." }
  let pem = req.body;
  let issuerChain = '';
  if (typeof req.body === 'object' && req.body.pem) {
    pem = req.body.pem;
    issuerChain = req.body.issuerChain ?? '';
  }

  // Handle case where bodyParser might have parsed it differently or it's a buffer
  if (Buffer.isBuffer(pem)) {
      pem = pem.toString('utf8');
  }

  const result = await validateAip(pem, issuerChain);
  if (result.valid) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
}
