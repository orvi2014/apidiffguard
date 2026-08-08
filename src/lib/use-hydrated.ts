"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * True once the component has hydrated on the client.
 *
 * Replaces the `useState(false)` + `useEffect(() => setMounted(true), [])`
 * idiom, which commits a throwaway render and then cascades a second one.
 * `useSyncExternalStore` gives React the server and client answers up front.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
