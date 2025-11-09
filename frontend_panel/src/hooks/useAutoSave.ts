// src/hooks/useAutoSave.ts
import { useEffect, useRef } from "react";
import { DealInputs } from "../types/deal";

interface AutoSaveOptions {
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave(
  inputs: DealInputs,
  currentDealId: string | null,
  onSave: () => void,
  options: AutoSaveOptions = {}
) {
  const { delay = 5000, enabled = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousHashRef = useRef<string>("");
  const onSaveRef = useRef(onSave);

  // Update the ref when onSave changes
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!enabled || !currentDealId || !inputs.address.trim()) {
      return;
    }

    // Create a hash of ALL inputs
    const currentHash = JSON.stringify(inputs);

    // Only auto-save if inputs have actually changed
    if (currentHash !== previousHashRef.current) {
      console.log("🔄 Inputs changed, scheduling auto-save...");

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        console.log("💾 Auto-saving deal...");
        onSaveRef.current();
        previousHashRef.current = currentHash; // Update hash AFTER save
      }, delay);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputs, currentDealId, delay, enabled]); // This will trigger on ANY input change
}
