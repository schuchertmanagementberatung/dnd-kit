let lastIdleCallbackId = 0;
// eslint-disable-next-line comma-spacing
let nextIdleCallbacks = new Map<number, () => void>();
let currentIdleCallbackId: number | void;

const handleIdleCallbacks = (): void => {
  const callbacksToCall = nextIdleCallbacks;
  currentIdleCallbackId = undefined;
  nextIdleCallbacks = new Map();
  callbacksToCall.forEach((callback) => {
    callback();
  });
};

export const requestSingleIdleCallback = (callback: () => void): number => {
  // eslint-disable-next-line no-plusplus
  const callbackId = lastIdleCallbackId;
  lastIdleCallbackId += 1;
  nextIdleCallbacks.set(callbackId, callback);
  if (currentIdleCallbackId === undefined) {
    currentIdleCallbackId = requestIdleCallback(handleIdleCallbacks);
  }

  return callbackId;
};

export const cancelSingleIdleCallback = (idleCallbackId: number): void => {
  nextIdleCallbacks.delete(idleCallbackId);
  if (nextIdleCallbacks.size === 0 && currentIdleCallbackId !== undefined) {
    cancelIdleCallback(currentIdleCallbackId);
    currentIdleCallbackId = undefined;
  }
};
