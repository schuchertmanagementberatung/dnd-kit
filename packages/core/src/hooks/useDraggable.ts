import {useCallback, useMemo} from 'react';
import {
  useIsomorphicLayoutEffect,
  useLatestValue,
  useUniqueId,
  usePassiveNodeRef,
} from '@schuchertmanagementberatung/dnd-kit-utilities';
import type {Data} from '../store';
import type {UniqueIdentifier} from '../types';
import {useSyntheticListeners, SyntheticListenerMap} from './utilities';
import {
  InternalContextStore,
  useInternalContextStore,
} from '../store/new-store';
import {shallow} from 'zustand/shallow';

export interface UseDraggableArguments {
  id: UniqueIdentifier;
  data?: Data;
  disabled?: boolean;
  attributes?: {
    role?: string;
    roleDescription?: string;
    tabIndex?: number;
  };
  includeActivatorEvent?: boolean;
}

export interface DraggableAttributes {
  role: string;
  tabIndex: number;
  'aria-disabled': boolean;
  'aria-pressed': boolean | undefined;
  'aria-roledescription': string;
  'aria-describedby': string;
}

export type DraggableSyntheticListeners = SyntheticListenerMap | undefined;

const defaultRole = 'button';

const ID_PREFIX = 'Droppable';

export function useDraggable({
  id,
  data,
  disabled = false,
  attributes,
  includeActivatorEvent = true,
}: UseDraggableArguments) {
  const key = useUniqueId(ID_PREFIX);
  const internalContextSelector = useCallback(
    (state: InternalContextStore) => {
      return {
        activators: state.activators,
        // this prevents rerenders in cases where we don't care about the ActivatorEvent
        activatorEvent: includeActivatorEvent
          ? state.activatorEvent
          : undefined,
        ariaDescribedByIdDraggable: state.ariaDescribedById?.draggable,
        draggableNodes: state.draggableNodes,
        isDragging: state.active?.id === id,
      };
    },
    [id, includeActivatorEvent]
  );
  const {
    activators,
    activatorEvent,
    ariaDescribedByIdDraggable,
    draggableNodes,
    isDragging,
  } = useInternalContextStore(internalContextSelector, shallow);
  const {
    role = defaultRole,
    roleDescription = 'draggable',
    tabIndex = 0,
  } = attributes ?? {};

  const [node, setNodeRef] = usePassiveNodeRef();
  const [activatorNode, setActivatorNodeRef] = usePassiveNodeRef();
  const listeners = useSyntheticListeners(activators, id);
  const dataRef = useLatestValue(data);

  useIsomorphicLayoutEffect(
    () => {
      draggableNodes.set(id, {id, key, node, activatorNode, data: dataRef});

      return () => {
        const node = draggableNodes.get(id);

        if (node && node.key === key) {
          draggableNodes.delete(id);
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draggableNodes, id]
  );

  const memoizedAttributes: DraggableAttributes = useMemo(
    () => ({
      role,
      tabIndex,
      'aria-disabled': disabled,
      'aria-pressed': isDragging && role === defaultRole ? true : undefined,
      'aria-roledescription': roleDescription,
      'aria-describedby': ariaDescribedByIdDraggable,
    }),
    [
      disabled,
      role,
      tabIndex,
      isDragging,
      roleDescription,
      ariaDescribedByIdDraggable,
    ]
  );

  return {
    activatorEvent,
    attributes: memoizedAttributes,
    isDragging,
    listeners: disabled ? undefined : listeners,
    node,
    setNodeRef,
    setActivatorNodeRef,
  };
}
