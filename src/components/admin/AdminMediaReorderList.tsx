'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminMediaDeleteButton } from '@/components/admin/AdminMediaDeleteButton';
import { toast } from 'sonner';

interface MediaItem {
  id: string;
  fileName: string;
  mediaType: string;
  displayOrder: number;
  mimeType?: string | null;
  url?: string | null;
  createdAt: Date | string;
}

interface AdminMediaReorderListProps {
  productId: string;
  media: MediaItem[];
}

interface SortableRowProps {
  item: MediaItem;
}

function SortableRow({ item }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="flex items-center gap-4 p-4">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="h-16 w-16 overflow-hidden rounded border bg-muted">
          {item.url ? (
            item.mimeType?.startsWith('video/') ? (
              <video src={item.url} className="h-full w-full object-cover" />
            ) : (
              <img src={item.url} alt={item.fileName} className="h-full w-full object-cover" />
            )
          ) : null}
        </div>

        <div className="flex-1 space-y-1">
          <div className="text-sm font-medium">{item.fileName}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] uppercase">
              {item.mediaType}
            </Badge>
            <span>Order: {item.displayOrder}</span>
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <AdminMediaDeleteButton mediaId={item.id} />
      </CardContent>
    </Card>
  );
}

export function AdminMediaReorderList({ productId, media }: AdminMediaReorderListProps) {
  const [items, setItems] = useState<MediaItem[]>(
    [...media].sort((a, b) => a.displayOrder - b.displayOrder)
  );
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(current, oldIndex, newIndex).map((item, index) => ({
        ...item,
        displayOrder: index,
      }));
      return reordered;
    });
  };

  const handleSaveOrder = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/admin/products/${productId}/media/order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: items.map((item, index) => ({
            id: item.id,
            displayOrder: index,
          })),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.error || 'Failed to save order');
        return;
      }

      toast.success('Media order saved');
    } catch (error) {
      console.error('Save order error:', error);
      toast.error('Failed to save order');
    } finally {
      setIsSaving(false);
    }
  };

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No media attached to this product.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Drag items to change display order.
        </p>
        <Button onClick={handleSaveOrder} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Order'}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((item) => (
              <SortableRow key={item.id} item={item} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
