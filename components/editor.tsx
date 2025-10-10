"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import Link from '@tiptap/extension-link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditorProps {
    onChange: (value: string) => void;
    value: string;
    placeholder?: string;
}

type Level = 1 | 2 | 3 | 4 | 5 | 6;

export const Editor = ({
    onChange,
    value,
    placeholder = "Write something...",
}: EditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-disc ml-4',
                    },
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-decimal ml-4',
                    },
                },
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline underline-offset-4'
                }
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: "min-h-[150px] w-full rounded-md bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    return (
        <div className="border rounded-md bg-background">
            <div className="border-b p-2 gap-x-2 flex items-center flex-wrap">
                <Select
                    defaultValue="paragraph"
                    onValueChange={(value: string) => {
                        if (value === 'paragraph') {
                            editor?.chain().focus().setParagraph().run();
                        } else {
                            editor?.chain().focus().toggleHeading({ level: parseInt(value) as Level }).run();
                        }
                    }}
                >
                    <SelectTrigger className="w-[120px] h-8">
                        <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="paragraph">Normal</SelectItem>
                        <SelectItem value="1">Heading 1</SelectItem>
                        <SelectItem value="2">Heading 2</SelectItem>
                        <SelectItem value="3">Heading 3</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-x-1 border-l ml-2 pl-2">
                    <Toggle
                        size="sm"
                        pressed={editor?.isActive('bold')}
                        onPressedChange={() => editor?.chain().focus().toggleBold().run()}
                    >
                        <Bold className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={editor?.isActive('italic')}
                        onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
                    >
                        <Italic className="h-4 w-4" />
                    </Toggle>
                </div>
                <div className="flex items-center gap-x-1 border-l ml-2 pl-2">
                    <Toggle
                        size="sm"
                        pressed={editor?.isActive('bulletList')}
                        onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
                    >
                        <List className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={editor?.isActive('orderedList')}
                        onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Toggle>
                </div>
                <div className="flex items-center gap-x-1 border-l ml-2 pl-2">
                    <Toggle
                        size="sm"
                        pressed={editor?.isActive('link')}
                        onPressedChange={() => {
                            if (editor?.isActive('link')) {
                                editor?.chain().focus().unsetLink().run();
                            } else {
                                const url = window.prompt('URL:');
                                if (url) {
                                    editor?.chain().focus().setLink({ href: url }).run();
                                }
                            }
                        }}
                    >
                        <LinkIcon className="h-4 w-4" />
                    </Toggle>
                </div>
            </div>
            <div className="prose w-full p-4 max-w-none">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}; 