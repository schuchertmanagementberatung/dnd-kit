import {create} from 'zustand';
import {getInitialState} from '../reducer';
import type {DroppableContainer, State} from '../types';
import {DroppableContainersMap} from '../constructors';

import type {Coordinates, UniqueIdentifier} from '../../types';

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

/**
 * for assumed performance reasons, these arrays don't contain tuples or objects.
 * Instead an entry consumes a fixed number of places. exmaple,
 * droppablesToRegister has an id at every even index, and the element to
 * register at every odd index: droppablesToRegister.push(id, element);
 */
const droppablesToRegister: Array<UniqueIdentifier | DroppableContainer> = [];
const droppablesToUnregister: Array<UniqueIdentifier | UniqueIdentifier> = [];
const droppablesToUpdateDisabled: Array<
  UniqueIdentifier | UniqueIdentifier | boolean
> = [];

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
          initialCoordinates: {x: 0, y: 0},
          translate: {x: 0, y: 0},
        },
      });
    },
    registerDroppable: (payload: RegisterDroppableActionPayload) => {
      const {element} = payload;
      const {id} = element;

      /**
       * every entry consumes 2 places in the array, so that we don't have to
       * create a new tuple or object for every entry
       */
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
          containers.set(
            droppablesToRegister[i] as UniqueIdentifier,
            droppablesToRegister[i + 1] as DroppableContainer
          );
        }
        droppablesToRegister.length = 0;
        set({
          droppable: {...state.droppable, containers},
        });
      });
    },
    setDroppableDisabled: (payload: SetDroppableDisabledActionPayload) => {
      const {id, key, disabled} = payload;

      /**
       * every entry consumes 3 places in the array, so that we don't have to
       * create a new tuple or object for every entry
       */
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
          const id = droppablesToUpdateDisabled[i] as UniqueIdentifier;
          const key = droppablesToUpdateDisabled[i + 1] as UniqueIdentifier;
          const disabled = droppablesToUpdateDisabled[i + 2] as boolean;
          const element = state.droppable.containers.get(id);
          if (!element || key !== element.key) {
            continue;
          }
          containers.set(id, {...element, disabled});
        }
        droppablesToUpdateDisabled.length = 0;
        set({
          droppable: {...state.droppable, containers},
        });
      });
    },
    unregisterDroppable: (payload: UnregisterDroppableActionPayload) => {
      const {id, key} = payload;

      /**
       * every entry consumes 2 places in the array, so that we don't have to
       * create a new tuple or object for every entry
       */
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
          const id = droppablesToUnregister[i] as UniqueIdentifier;
          const key = droppablesToUnregister[i + 1] as UniqueIdentifier;
          const element = state.droppable.containers.get(id);
          if (!element || key !== element.key) {
            continue;
          }
          containers.delete(id);
        }
        droppablesToUnregister.length = 0;
        set({
          droppable: {...state.droppable, containers},
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
