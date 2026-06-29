import { useState, useRef, useCallback, useEffect } from 'react';
import { syncPinStatusAction } from '../actions/chat.actions';
import { devLog } from '@/lib/utils';

export function usePinnedThreads(initialPinned = []) {
  // Initialize state with a Set of pinned thread IDs
  const [pinned, setPinned] = useState(new Set(initialPinned)); 
  const timers = useRef({}); // Stores the setTimeout IDs
  const lastState = useRef({}); // Stores the "Final Intent"

  // Sync local state when initialPinned changes (e.g. after data load)
  useEffect(() => {
    setPinned(new Set(initialPinned));
  }, [JSON.stringify(initialPinned)]); // Use stringify to compare array content

  const togglePin = useCallback((threadId) => {
    // 1. UI Update (Immediate/Optimistic)
    let isNowPinned = false;
    setPinned((curr) => {
      const next = new Set(curr);
      if (next.has(threadId)) {
        next.delete(threadId);
        isNowPinned = false;
      } else {
        next.add(threadId);
        isNowPinned = true;
      }
      // Store the latest intent in a ref so the timer can see it
      lastState.current[threadId] = isNowPinned;
      return next;
    });

    // 2. The "Shield": Clear the previous timer
    // If the user clicks again before 500ms, the previous API call is cancelled
    if (timers.current[threadId]) {
      clearTimeout(timers.current[threadId]);
    }

    // 3. Set the new timer
    timers.current[threadId] = setTimeout(async () => {
      const finalIntent = lastState.current[threadId];
      
      try {
        // Now send exactly ONE network request for the FINAL intent.
        devLog(`Sending ONE request for ${threadId}: Pinned = ${finalIntent}`);
        const result = await syncPinStatusAction(threadId, finalIntent);
        
        if (result.error) {
          console.error("Pin action failed, rolling back:", result.error);
          // Handle rollback
          setPinned((curr) => {
            const next = new Set(curr);
            if (finalIntent) {
              next.delete(threadId); // It was supposed to be pinned, so unpin it
            } else {
              next.add(threadId); // It was supposed to be unpinned, so pin it back
            }
            return next;
          });
          // Optionally show a toast/alert here
        }

      } catch (e) {
        console.error("Unexpected error in pin timer:", e);
        // Handle rollback 
        setPinned((curr) => {
          const next = new Set(curr);
          if (finalIntent) {
            next.delete(threadId);
          } else {
            next.add(threadId);
          }
          return next;
        });
      } finally {
        delete timers.current[threadId];
      }
    }, 500); // 500ms is usually the sweet spot for "instant" feel vs backend safety
  }, []);

  return { pinned, setPinned, togglePin }; // Added setPinned to allow initialization from parent if needed
}
