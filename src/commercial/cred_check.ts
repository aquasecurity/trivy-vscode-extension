import { HmacSHA256 } from 'crypto-js';
import moment from 'moment';

export default async function checkCredentialConnection(creds: {
  apiKey: string;
  apiSecret: string;
  aquaUrl: string;
  cspmUrl: string;
}): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      if (
        !creds.apiKey ||
        !creds.apiSecret ||
        !creds.aquaUrl ||
        !creds.cspmUrl
      ) {
        return reject(new Error('Missing credentials'));
      }

      if (creds.cspmUrl.endsWith('/')) {
        creds.cspmUrl = creds.cspmUrl.slice(0, -1);
      }
      const body = JSON.stringify({
        validity: 120,
        allowed_endpoints: ['ANY:V2/*'],
      });
      const requestUrl = `${creds.cspmUrl}/v2/tokens`;

      const timestamp = moment.unix(new Date().getTime() / 1000).valueOf();
      const someString = timestamp + 'POST' + '/v2/tokens' + body;

      // compute the 256 hmac
      const hmac = HmacSHA256(someString, creds.apiSecret);

      fetch(requestUrl, {
        method: 'POST',
        headers: {
          'x-signature': hmac.toString(),
          'x-timestamp': timestamp.toString(),
          'x-api-key': creds.apiKey,
        },
        body: body,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to validate credentials: ${response.statusText}`
            );
          }
          return resolve(true);
        })
        .catch((error) => {
          return reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}
