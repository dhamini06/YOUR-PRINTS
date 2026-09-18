import { HealthCheckResponse, Investigation } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function checkBackendHealth(): Promise<HealthCheckResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Health check failed with status: ${res.status}`);
  }
  return res.json();
}

export async function createInvestigation(
  target: string,
  turnstileToken?: string
): Promise<Investigation> {
  const res = await fetch(`${API_BASE_URL}/v1/investigations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target,
      target_type: 'EMAIL',
      turnstile_token: turnstileToken || null,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Investigation request failed with status: ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export async function getInvestigation(id: string): Promise<Investigation> {
  const res = await fetch(`${API_BASE_URL}/v1/investigations/${id}`, {
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Investigation lookup failed with status: ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}
