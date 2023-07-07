import { create } from 'zustand';
import { getInitialState } from '../reducer';
import type { DroppableContainer, State } from '../types';
import { DroppableContainersMap } from '../constructors';

import type { Coordinates, UniqueIdentifier } from '../../types';

const initialState = getInitialState();

type Actions = {
  dragStart: (payload: DragStartActionPayload) => void;
  dragMove: (payload: DragMoveActionPayload) => void;
  dragEnd: () => void;
  registerDroppable: (payload: RegisterDroppableActionPayload) => void;
  setDroppableDisabled: (payload: SetDroppableDisabledActionPayload) => void;
  unregisterDroppable: (payload: UnregisterDroppableActionPayload) => void;
};
export type DndKitStore = State & Actions;

const droppablesToRegister = [];
const droppablesToUnregister = [];
const droppablesToUpdateDisabled = [];

export const useDndKitStore = create<DndKitStore>((set, get) => {
  return {
    ...initialState,
    dragStart: (payload: DragStartActionPayload) => {
      const state = get();
      set({
        draggable: {
          ...state.draggable,
          initialCoordinates: payload.initialCoordinates,
          active: payload.active,
        },
      });
    },
    dragMove: (payload: DragMoveActionPayload) => {
      const state = get();
      if (!state.draggable.active) {
        return;
      }
      set({
        draggable: {
          ...state.draggable,
          translate: {
            x: payload.coordinates.x - state.draggable.initialCoordinates.x,
            y: payload.coordinates.y - state.draggable.initialCoordinates.y,
          },
        },
      });
    },
    dragEnd: () => {
      const state = get();
      set({
        draggable: {
          ...state.draggable,
          active: null,
          initialCoordinates: { x: 0, y: 0 },
          translate: { x: 0, y: 0 },
        },
      });
    },
    registerDroppable: (payload: RegisterDroppableActionPayload) => {
      const { element } = payload;
      const { id } = element;
      droppablesToRegister.push(id, element);
      if (droppablesToRegister.length !== 2) {
        return;
      }

      queueMicrotask(() => {
        const state = get();
        const containers = new DroppableContainersMap(
          state.droppable.containers
        );
        for (let i = 0; i < droppablesToRegister.length; i += 2) {
          containers.set(droppablesToRegister[i], droppablesToRegister[i + 1]);
        }
        droppablesToRegister.length = 0;
        set({
          droppable: { ...state.droppable, containers },
        });
      });
    },
    setDroppableDisabled: (payload: SetDroppableDisabledActionPayload) => {
      const { id, key, disabled } = payload;
      droppablesToUpdateDisabled.push(id, key, disabled);
      if (droppablesToUpdateDisabled.length !== 3) {
        return;
      }

      queueMicrotask(() => {
        const state = get();

        const containers = new DroppableContainersMap(
          state.droppable.containers
        );
        for (let i = 0; i < droppablesToUpdateDisabled.length; i += 3) {
          const id = droppablesToUpdateDisabled[i];
          const key = droppablesToUpdateDisabled[i + 1];
          const disabled = droppablesToUpdateDisabled[i + 2];
          const element = state.droppable.containers.get(id);
          if (!element || key !== element.key) {
            continue;
          }
          containers.set(id, { ...element, disabled });
        }
        droppablesToUpdateDisabled.length = 0;
        set({
          droppable: { ...state.droppable, containers },
        });
      });
    },
    unregisterDroppable: (payload: UnregisterDroppableActionPayload) => {
      const { id, key } = payload;

      droppablesToUnregister.push(id, key);
      if (droppablesToRegister.length !== 2) {
        return;
      }

      queueMicrotask(() => {
        const state = get();

        const containers = new DroppableContainersMap(
          state.droppable.containers
        );
        for (let i = 0; i < droppablesToUnregister.length; i += 2) {
          const id = droppablesToUnregister[i];
          const key = droppablesToUnregister[i + 1];
          const element = state.droppable.containers.get(id);
          if (!element || key !== element.key) {
            continue;
          }
          containers.delete(id);
        }
        droppablesToUnregister.length = 0;
        set({
          droppable: { ...state.droppable, containers },
        });
      });
    },
  };
});

type DragStartActionPayload = {
  active: UniqueIdentifier;
  initialCoordinates: Coordinates;
};

type DragMoveActionPayload = {
  coordinates: Coordinates;
};

type RegisterDroppableActionPayload = {
  element: DroppableContainer;
};

type SetDroppableDisabledActionPayload = {
  id: UniqueIdentifier;
  key: UniqueIdentifier;
  disabled: boolean;
};

type UnregisterDroppableActionPayload = {
  id: UniqueIdentifier;
  key: UniqueIdentifier;
};
