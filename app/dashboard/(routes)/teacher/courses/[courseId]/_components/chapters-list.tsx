"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Chapter } from "@prisma/client";
import { Grip, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

interface ChaptersListProps {
    items: Chapter[];
    onReorder: (updateData: { id: string; position: number }[]) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export const ChaptersList = ({
    items,
    onReorder,
    onEdit,
    onDelete
}: ChaptersListProps) => {
    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const chapters = Array.from(items);
        const [reorderedItem] = chapters.splice(result.source.index, 1);
        chapters.splice(result.destination.index, 0, reorderedItem);

        const updateData = chapters.map((chapter, index) => ({
            id: chapter.id,
            position: index + 1,
        }));

        onReorder(updateData);
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="chapters">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                        {items.map((chapter, index) => (
                            <Draggable 
                                key={chapter.id} 
                                draggableId={chapter.id} 
                                index={index}
                            >
                                {(provided) => (
                                    <div
                                        className={cn(
                                            "flex items-center gap-x-2 bg-muted border-muted text-muted-foreground rounded-md mb-4 text-sm",
                                            chapter.isPublished && "bg-primary/20 border-primary/20"
                                        )}
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                    >
                                        <div
                                            className={cn(
                                                "px-2 py-3 border-r border-r-muted hover:bg-muted rounded-l-md transition",
                                                chapter.isPublished && "border-r-primary/20"
                                            )}
                                            {...provided.dragHandleProps}
                                        >
                                            <Grip className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 px-2">
                                            {chapter.title}
                                        </div>
                                        <div className="ml-auto pr-2 flex items-center gap-x-2">
                                            {chapter.isFree && (
                                                <Badge>
                                                    مجاني
                                                </Badge>
                                            )}
                                            <Badge
                                                className={cn(
                                                    "bg-muted text-muted-foreground",
                                                    chapter.isPublished && "bg-primary text-primary-foreground"
                                                )}
                                            >
                                                {chapter.isPublished ? "تم النشر" : "مسودة"}
                                            </Badge>
                                            <button
                                                onClick={() => onEdit(chapter.id)}
                                                className="hover:opacity-75 transition"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <Trash2
                                                onClick={() => onDelete(chapter.id)}
                                                className="w-4 h-4 cursor-pointer hover:opacity-75 transition"
                                            />
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}; 