"use client"

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, PlusCircle, Grip, Loader2 } from "lucide-react";
import { Chapter } from "@prisma/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ChapterFormProps {
    initialData: {
        chapters: Chapter[];
    };
    courseId: string;
}

const formSchema = z.object({
    title: z.string().min(1, {
        message: "Title is required",
    }),
});

export const ChapterForm = ({
    initialData,
    courseId
}: ChapterFormProps) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const toggleCreating = () => setIsCreating((current) => !current);

    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
        },
    });

    const { isSubmitting, isValid } = form.formState;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await axios.post(`/api/courses/${courseId}/chapters`, values);
            toast.success("Chapter created");
            toggleCreating();
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        }
    }

    const onReorder = async (updateData: { id: string; position: number }[]) => {
        try {
            setIsUpdating(true);
            await axios.put(`/api/courses/${courseId}/chapters/reorder`, {
                list: updateData
            });
            toast.success("Chapters reordered");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsUpdating(false);
        }
    }

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(initialData.chapters);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const updateData = items.map((item, index) => ({
            id: item.id,
            position: index + 1,
        }));

        onReorder(updateData);
    }

    return (
        <div className="relative mt-6 border bg-card rounded-md p-4">
            {isUpdating && (
                <div className="absolute h-full w-full bg-slate-500/20 top-0 right-0 rounded-m flex items-center justify-center">
                    <Loader2 className="animate-spin h-6 w-6 text-sky-700" />
                </div>
            )}
            <div className="font-medium flex items-center justify-between">
                الفصول
                <Button onClick={toggleCreating} variant="ghost">
                    {isCreating && (<>الغاء</>)}
                    {!isCreating && (
                    <>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        إضافة فصل
                    </>)}
                </Button>
            </div>
            {isCreating && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField 
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input 
                                            disabled={isSubmitting}
                                            placeholder="e.g. 'Introduction to the course'"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button disabled={!isValid || isSubmitting} type="submit">
                                إنشاء
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
            {!isCreating && (
                <div className={cn(
                    "text-sm mt-2",
                    !initialData.chapters.length && "text-muted-foreground italic"
                )}>
                    {!initialData.chapters.length && "لا يوجد فصول"}
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="chapters">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {initialData.chapters.map((chapter, index) => (
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
                                                        <Grip
                                                            className="h-5 w-5"
                                                        />
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
                                                                chapter.isPublished && "bg-primary/20 text-primary"
                                                            )}
                                                        >
                                                            {chapter.isPublished ? "منشور" : "مسودة"}
                                                        </Badge>
                                                        <Pencil
                                                            onClick={() => router.push(`/dashboard/teacher/courses/${courseId}/chapters/${chapter.id}`)}
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
                </div>
            )}
        </div>
    )
} 