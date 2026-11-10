import { type KeyboardEvent as ReactKeyboardEvent, useRef, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

// Dragging the cards of Put in order into place (SLJ-180), next to tapping
// them in turn. A mouse drag starts once the pointer has moved a little and a
// touch drag after a short press, so a tap stays a tap and a swipe still
// scrolls. From the keyboard, each card's grip picks it up (Space or Enter),
// the arrow keys move it and Space or Enter drops it; screen readers hear
// each step. Dropping a card fixes the order of all the cards as shown; only
// the card in hand is highlighted while it moves.

// The click that follows a drop isn't a tap.
const AFTER_DROP_MS = 300;

const idOf = (itemIndex: number): UniqueIdentifier => `item-${itemIndex}`;
const itemOf = (id: UniqueIdentifier) => Number(String(id).slice("item-".length));

export function SortableCards({
  children,
  labelOf,
  onReorder,
  order,
}: {
  // Renders a card. `isDragging`: it's the one in hand. `wasDropped()`: true
  // just after a drop, so the click that follows is ignored.
  children: (itemIndex: number, state: { isDragging: boolean; wasDropped: () => boolean }) => ReactNode;
  labelOf: (itemIndex: number) => string;
  onReorder: (order: number[]) => void;
  order: number[];
}) {
  const { t } = useTranslation();
  const droppedAt = useRef(0);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = order.map(idOf);
  const place = (id: UniqueIdentifier | undefined) => (id === undefined ? 0 : ids.indexOf(id) + 1);
  const label = (id: UniqueIdentifier) => labelOf(itemOf(id));

  function onDragEnd({ activatorEvent, active, over }: DragEndEvent) {
    // Only a mouse or a finger lets go with a click; a keyboard drop doesn't.
    if (!(activatorEvent instanceof KeyboardEvent)) droppedAt.current = Date.now();
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(order, ids.indexOf(active.id), ids.indexOf(over.id)));
  }

  return (
    <DndContext
      accessibility={{
        announcements: {
          onDragCancel: ({ active }) => t("putInOrder.drag.cancelled", { label: label(active.id) }),
          onDragEnd: ({ active, over }) =>
            t("putInOrder.drag.dropped", { label: label(active.id), number: place(over?.id ?? active.id) }),
          onDragOver: ({ active, over }) => t("putInOrder.drag.over", { label: label(active.id), number: place(over?.id ?? active.id) }),
          onDragStart: ({ active }) => t("putInOrder.drag.pickedUp", { label: label(active.id), number: place(active.id) }),
        },
        screenReaderInstructions: { draggable: t("putInOrder.drag.instructions") },
      }}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      sensors={sensors}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {order.map((itemIndex) => (
          <SortableCard id={idOf(itemIndex)} key={itemIndex} label={labelOf(itemIndex)}>
            {(isDragging) => children(itemIndex, { isDragging, wasDropped: () => Date.now() - droppedAt.current < AFTER_DROP_MS })}
          </SortableCard>
        ))}
      </SortableContext>
    </DndContext>
  );
}

// One card in the grid: the whole card follows the mouse or a finger; its
// grip is where the keyboard picks it up.
function SortableCard({
  children,
  id,
  label,
}: {
  children: (isDragging: boolean) => ReactNode;
  id: UniqueIdentifier;
  label: string;
}) {
  const { t } = useTranslation();
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({ id });
  // The keyboard's way in is the grip; the mouse's and a finger's, the whole card.
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  const onGripKeyDown = onKeyDown as ((event: ReactKeyboardEvent<HTMLButtonElement>) => void) | undefined;

  return (
    <div
      className="relative flex touch-manipulation flex-col"
      data-dragging={isDragging ? "" : undefined}
      data-testid="put-in-order-slot"
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      {...pointerListeners}
    >
      {children(isDragging)}
      <Button
        {...attributes}
        aria-label={t("putInOrder.drag.handle", { label })}
        className="absolute right-1 bottom-1"
        data-testid="put-in-order-handle"
        onKeyDown={onGripKeyDown}
        ref={setActivatorNodeRef}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <GripVertical aria-hidden="true" />
      </Button>
    </div>
  );
}
