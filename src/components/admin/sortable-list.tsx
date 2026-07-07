"use client";

// Generic vertical drag-and-drop list built on dnd-kit, used for
// reordering siblings at every level of the syllabus tree (and videos,
// glossary terms). Calls onReorder with the full new id order.
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function DragHandle({
  attributes,
  listeners,
  className,
}: {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing",
        className
      )}
      title="Drag to reorder"
      {...attributes}
      {...(listeners ?? {})}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

export interface SortableRenderProps {
  handleAttributes: Record<string, unknown>;
  handleListeners: Record<string, unknown> | undefined;
  isDragging: boolean;
}

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (props: SortableRenderProps) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "z-10 opacity-80")}
    >
      {children({
        handleAttributes: attributes as unknown as Record<string, unknown>,
        handleListeners: listeners as unknown as Record<string, unknown>,
        isDragging,
      })}
    </div>
  );
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T, props: SortableRenderProps) => React.ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(items, oldIndex, newIndex).map((i) => i.id);
    onReorder(newOrder);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={className}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {(props) => renderItem(item, props)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
