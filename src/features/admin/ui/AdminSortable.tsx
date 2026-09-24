"use client";

import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export { arrayMove };

export function adminSortableIds(count: number, prefix = "row"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

export function reorderBySortableIds<T>(
  items: T[],
  activeId: string,
  overId: string,
  prefix = "row",
): T[] | null {
  const oldIndex = items.findIndex((_, i) => `${prefix}-${i}` === activeId);
  const newIndex = items.findIndex((_, i) => `${prefix}-${i}` === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null;
  return arrayMove(items, oldIndex, newIndex);
}

type AdminSortableListProps = {
  ids: string[];
  disabled?: boolean;
  onReorder: (activeId: string, overId: string) => void;
  children: ReactNode;
  className?: string;
  as?: "ul" | "div";
};

export function AdminSortableList({
  ids,
  disabled,
  onReorder,
  children,
  className,
  as: Tag = "ul",
}: AdminSortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <Tag className={className}>{children}</Tag>
      </SortableContext>
    </DndContext>
  );
}

export function AdminDragHandle({
  disabled,
  attributes,
  listeners,
  className,
}: {
  disabled?: boolean;
  attributes: object;
  listeners?: object;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-8 shrink-0 cursor-grab items-center justify-center self-stretch text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      aria-label="Drag to reorder"
      disabled={disabled}
      {...attributes}
      {...listeners}
    >
      <DragIndicatorIcon sx={{ fontSize: 18 }} />
    </button>
  );
}

export function useAdminSortableItem(id: string, disabled?: boolean) {
  const sortable = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  return { ...sortable, style };
}

/** Sortable item with render-prop access to drag handle + node ref. */
export function AdminSortableItem({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (args: {
    setNodeRef: (node: HTMLElement | null) => void;
    style: CSSProperties;
    isDragging: boolean;
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
  }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, style, isDragging } =
    useAdminSortableItem(id, disabled);

  return (
    <>
      {children({
        setNodeRef,
        style,
        isDragging,
        attributes,
        listeners,
      })}
    </>
  );
}
