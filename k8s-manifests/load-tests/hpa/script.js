import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    hpa: {
      executor: 'ramping-arrival-rate',

      // Requests per second.
      startRate: 5,
      timeUnit: '1s',

      preAllocatedVUs: 20,
      maxVUs: 100,

      stages: [
        { target: 5, duration: '30s' },
        { target: 10, duration: '45s' },
        { target: 20, duration: '60s' },
        { target: 30, duration: '90s' },
        { target: 10, duration: '30s' },
      ],
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const response = http.post(
    'http://auth-svc:3000/login',
    JSON.stringify({
      username: 'hpa-test',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  check(response, {
    'login returns 200': (r) => r.status === 200,
    'login returns token': (r) => !!r.json('token'),
  });

  if (response.status !== 200) {
    throw new Error(`Login failed: HTTP ${response.status}`);
  }

  const token = response.json('token');

  if (!token) {
    throw new Error('Login response did not contain a token');
  }

  return { token };
}

export default function (data) {
  const response = http.post(
    'http://order-svc:8080/orders',
    null,
    {
      headers: {
        Authorization: `Bearer ${data.token}`,
      },
    },
  );

  check(response, {
    'order returns 200': (r) => r.status === 200,
  });
}