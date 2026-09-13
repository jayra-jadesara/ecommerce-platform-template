"use client";

type AuthSnapshot = {
  ready: boolean;
  email: string | null;
  displayName: string | null;
};

let snapshot: AuthSnapshot = { ready: false, email: null, displayName: null };
const listeners = new Set<() => void>();

export function emitHeaderAuth() {
  listeners.forEach((listener) => listener());
}

export function getHeaderAuthSnapshot(): AuthSnapshot {
  return snapshot;
}

export function setHeaderAuthSnapshot(next: AuthSnapshot) {
  snapshot = next;
  emitHeaderAuth();
}

/** Clear cached header auth after logout. */
export function clearHeaderAuthSnapshot() {
  snapshot = { ready: true, email: null, displayName: null };
  emitHeaderAuth();
}

/** Instantly show signed-in user in the navbar (before home finishes loading). */
export function applyHeaderAuthUser(input: {
  email: string | null;
  displayName: string | null;
}) {
  snapshot = {
    ready: true,
    email: input.email,
    displayName: input.displayName,
  };
  emitHeaderAuth();
}

export function subscribeHeaderAuth(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const HEADER_AUTH_SERVER_SNAPSHOT: AuthSnapshot = {
  ready: false,
  email: null,
  displayName: null,
};
