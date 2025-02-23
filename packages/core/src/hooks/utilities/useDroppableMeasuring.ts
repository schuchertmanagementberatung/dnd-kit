import {useCallback, useEffect, useRef, useState} from 'react';
import {
  useLatestValue,
  useLazyMemo,
} from '@schuchertmanagementberatung/dnd-kit-utilities';

import {Rect} from '../../utilities/rect';
import type {DroppableContainer, RectMap} from '../../store/types';
import type {ClientRect, UniqueIdentifier} from '../../types';

interface Arguments {
  dragging: boolean;
  dependencies: any[];
  config: DroppableMeasuring;
}

export enum MeasuringStrategy {
  Always,
  BeforeDragging,
  WhileDragging,
}

export enum MeasuringFrequency {
  Optimized = 'optimized',
}

type MeasuringFunction = (element: HTMLElement) => ClientRect;

export interface DroppableMeasuring {
  measure: MeasuringFunction;
  strategy: MeasuringStrategy;
  frequency: MeasuringFrequency | number;
}

const defaultValue: RectMap = new Map();

export function useDroppableMeasuring(
  containers: DroppableContainer[],
  {dragging, dependencies, config}: Arguments
) {
  const [
    containerIdsScheduledForMeasurement,
    setContainerIdsScheduledForMeasurement,
  ] = useState<UniqueIdentifier[] | null>(null);
  const measuringScheduled = containerIdsScheduledForMeasurement != null;
  const {frequency, measure, strategy} = config;
  const containersRef = useRef(containers);
  const disabled = isDisabled();
  const disabledRef = useLatestValue(disabled);

  const idsToAdd = useRef<Set<UniqueIdentifier> | void>(undefined);

  const measureDroppableContainers = useCallback(
    (ids: UniqueIdentifier[] = []) => {
      if (disabledRef.current) {
        return;
      }

      let isFirstCall = idsToAdd.current === undefined;
      if (isFirstCall) {
        idsToAdd.current = new Set();
      }
      for (const id of ids) {
        (idsToAdd.current as Set<UniqueIdentifier>).add(id);
      }

      if (!isFirstCall) {
        return;
      }

      // requestIdleCallback is not available in safari, but factro provides a polyfill
      requestIdleCallback(() => {
        const newIds = idsToAdd.current as Set<UniqueIdentifier>;
        idsToAdd.current = undefined;
        setContainerIdsScheduledForMeasurement((value) =>
          value ? value.concat(Array.from(newIds)) : ids
        );
      });
    },
    [disabledRef]
  );
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const droppableRects = useLazyMemo<RectMap>(
    (previousValue) => {
      if (disabled && !dragging) {
        return defaultValue;
      }

      const ids = containerIdsScheduledForMeasurement;

      if (
        !previousValue ||
        previousValue === defaultValue ||
        containersRef.current !== containers ||
        ids != null
      ) {
        const map: RectMap = new Map();

        for (let container of containers) {
          if (!container) {
            continue;
          }

          if (
            ids &&
            ids.length > 0 &&
            !ids.includes(container.id) &&
            container.rect.current
          ) {
            // This container does not need to be re-measured
            map.set(container.id, container.rect.current);
            continue;
          }

          const node = container.node.current;
          const rect = node ? new Rect(measure(node), node) : null;

          container.rect.current = rect;

          if (rect) {
            map.set(container.id, rect);
          }
        }

        return map;
      }

      return previousValue;
    },
    [
      containers,
      containerIdsScheduledForMeasurement,
      dragging,
      disabled,
      measure,
    ]
  );

  useEffect(() => {
    containersRef.current = containers;
  }, [containers]);

  useEffect(
    () => {
      if (disabled) {
        return;
      }

      requestAnimationFrame(() => measureDroppableContainers());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragging, disabled]
  );

  useEffect(() => {
    if (measuringScheduled) {
      setContainerIdsScheduledForMeasurement(null);
    }
  }, [measuringScheduled]);

  useEffect(
    () => {
      if (
        disabled ||
        typeof frequency !== 'number' ||
        timeoutId.current !== null
      ) {
        return;
      }

      timeoutId.current = setTimeout(() => {
        measureDroppableContainers();
        timeoutId.current = null;
      }, frequency);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frequency, disabled, measureDroppableContainers, ...dependencies]
  );

  return {
    droppableRects,
    measureDroppableContainers,
    measuringScheduled,
  };

  function isDisabled() {
    switch (strategy) {
      case MeasuringStrategy.Always:
        return false;
      case MeasuringStrategy.BeforeDragging:
        return dragging;
      default:
        return !dragging;
    }
  }
}
